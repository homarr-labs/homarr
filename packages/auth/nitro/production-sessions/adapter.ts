import type { Adapter, AdapterAccount, AdapterSession } from "@auth/core/adapters";
import type { OwnedSessionObservation } from "../sql-authority/contracts";

import { IssuerStagingError, projectAdapterUser, snapshotIssuerSession, snapshotIssuerUser } from "./persistence";
import type {
  IssuerEffect,
  IssuerOperationLedger,
  IssuerReadRepository,
  IssuerReadWitness,
  IssuerUserRecord,
} from "./persistence";

export interface StagedOidcAdapterConfiguration {
  readonly repository: IssuerReadRepository;
  readonly ledger: IssuerOperationLedger;
  readonly dangerousCredentialsLinking: boolean;
  readonly admittedSession: { readonly token: string; readonly userId: string; readonly expiresAt: number } | null;
  readonly now: () => number;
  readonly observation?: OwnedSessionObservation;
  readonly observationToken?: string | null;
}

export function createStagedOidcAdapter(configuration: StagedOidcAdapterConfiguration) {
  const { repository, ledger } = configuration;
  const witnesses: IssuerReadWitness[] = [];
  const effects: IssuerEffect[] = [];
  const users = new Map<string, IssuerUserRecord>();
  const createdUserIds = new Set<string>();
  const accounts = new Map<string, AdapterAccount | null>();
  const sessions = new Map<string, AdapterSession | null>();
  const readUser = async (id: string): Promise<IssuerUserRecord | null> => {
    const staged = users.get(id);
    if (staged) return staged;
    const selected = await repository.findUserById(id);
    let user: IssuerUserRecord | null = null;
    if (selected) user = snapshotIssuerUser(selected);
    witnesses.push({ kind: "user-id", id, selected: user });
    if (user) users.set(id, user);
    return user;
  };
  const readEmail = async (email: string, provider: "oidc" | "credentials") => {
    const staged = [...users.values()].find(
      (user) => createdUserIds.has(user.id) && user.email === email && user.provider === provider,
    );
    if (staged) return staged;
    const selected = await repository.findUserByEmail({ email, provider });
    let user: IssuerUserRecord | null = null;
    if (selected) {
      if (selected.provider !== provider || selected.email !== email) throw new IssuerStagingError();
      user = snapshotIssuerUser(selected);
      users.set(user.id, user);
    }
    witnesses.push({ kind: "user-email", email, provider, selected: user });
    return user;
  };
  const readAccount = async (selector: { provider: string; providerAccountId: string }) => {
    if (selector.provider !== "oidc") throw new IssuerStagingError();
    const key = JSON.stringify([selector.provider, selector.providerAccountId]);
    if (accounts.has(key)) return accounts.get(key) ?? null;
    const selected = await repository.findAccount(selector);
    let account: AdapterAccount | null = null;
    if (selected) {
      if (selected.provider !== selector.provider || selected.providerAccountId !== selector.providerAccountId) {
        throw new IssuerStagingError();
      }
      account = { ...selected };
    }
    witnesses.push({ kind: "account", ...selector, selected: account });
    accounts.set(key, account);
    return account;
  };
  const readSession = async (token: string) => {
    const observation = configuration.observation;
    if (observation) {
      if (token !== configuration.observationToken) throw new IssuerStagingError();
      if (observation.type === "expiry-margin") throw new IssuerStagingError();
      if (observation.type === "absent") return null;
      if (observation.record.session.sessionToken !== token) throw new IssuerStagingError();
      if (sessions.has(token) && sessions.get(token) === null) return null;
      const result = {
        session: snapshotIssuerSession(observation.record.session),
        user: snapshotIssuerUser(observation.record.user),
      };
      if (!witnesses.some((witness) => witness.kind === "session" && witness.token === token))
        witnesses.push({ kind: "session", token, selected: result });
      users.set(result.user.id, result.user);
      return result;
    }
    if (sessions.has(token)) {
      const session = sessions.get(token);
      if (!session) return null;
      const user = await readUser(session.userId);
      if (!user) throw new IssuerStagingError();
      return { session, user };
    }
    const admitted = configuration.admittedSession;
    if (!admitted || admitted.token !== token) return null;
    const selected = await repository.findSession(token);
    if (
      !selected ||
      selected.session.sessionToken !== token ||
      selected.user.id !== admitted.userId ||
      selected.session.userId !== admitted.userId ||
      selected.session.expires.valueOf() !== admitted.expiresAt ||
      selected.session.expires.valueOf() <= configuration.now()
    ) {
      throw new IssuerStagingError();
    }
    const result = { session: snapshotIssuerSession(selected.session), user: snapshotIssuerUser(selected.user) };
    witnesses.push({ kind: "session", token, selected: result });
    users.set(result.user.id, result.user);
    sessions.set(token, result.session);
    return result;
  };
  const adapter: Adapter = {
    createUser: (user) =>
      ledger.run("adapter-create-user", async () => {
        if (!user.id || users.has(user.id) || (await readUser(user.id))) throw new IssuerStagingError();
        const created: IssuerUserRecord = snapshotIssuerUser({
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          emailVerified: user.emailVerified ?? null,
          image: user.image ?? null,
          password: null,
          provider: "oidc",
          colorScheme: "dark",
        });
        users.set(created.id, created);
        createdUserIds.add(created.id);
        effects.push({ kind: "create-user", user: created });
        return projectAdapterUser(created);
      }),
    getUser: (id) =>
      ledger.run("adapter-get-user", async () => {
        const user = await readUser(id);
        if (!user) return null;
        return projectAdapterUser(user);
      }),
    getUserByEmail: (email) =>
      ledger.run("adapter-get-email", async () => {
        let user = await readEmail(email, "oidc");
        if (!user && configuration.dangerousCredentialsLinking) user = await readEmail(email, "credentials");
        if (!user) return null;
        return projectAdapterUser(user);
      }),
    getUserByAccount: (selector) =>
      ledger.run("adapter-get-account-user", async () => {
        const account = await readAccount(selector);
        if (!account) return null;
        const user = await readUser(account.userId);
        if (!user) throw new IssuerStagingError();
        return projectAdapterUser(user);
      }),
    getAccount: (providerAccountId, provider) =>
      ledger.run("adapter-get-account", () => readAccount({ provider, providerAccountId })),
    updateUser: (update) =>
      ledger.run("adapter-update-user", async () => {
        const previous = await readUser(update.id);
        if (!previous) throw new IssuerStagingError();
        const user = snapshotIssuerUser({ ...previous, ...update });
        users.set(user.id, user);
        effects.push({ kind: "update-user", user: { ...update } });
        return projectAdapterUser(user);
      }),
    linkAccount: (account) =>
      ledger.run("adapter-link-account", async () => {
        if (account.provider !== "oidc" || account.type !== "oidc" || !(await readUser(account.userId))) {
          throw new IssuerStagingError();
        }
        const previous = await readAccount(account);
        if (previous) throw new IssuerStagingError();
        const staged = { ...account };
        accounts.set(JSON.stringify([account.provider, account.providerAccountId]), staged);
        effects.push({ kind: "link-account", account: staged });
        return { ...staged };
      }),
    createSession: (session) =>
      ledger.run("adapter-create-session", async () => {
        if (
          !(await readUser(session.userId)) ||
          !/^[a-f0-9]{96}$/.test(session.sessionToken) ||
          !Number.isFinite(session.expires.valueOf()) ||
          session.expires.valueOf() <= configuration.now()
        ) {
          throw new IssuerStagingError();
        }
        const previous = await repository.findSession(session.sessionToken);
        if (previous || sessions.has(session.sessionToken)) throw new IssuerStagingError();
        witnesses.push({ kind: "session", token: session.sessionToken, selected: null });
        const staged = snapshotIssuerSession(session);
        sessions.set(staged.sessionToken, staged);
        effects.push({ kind: "create-session", session: staged });
        return snapshotIssuerSession(staged);
      }),
    getSessionAndUser: (token) =>
      ledger.run("adapter-get-session", async () => {
        const selected = await readSession(token);
        if (!selected) return null;
        return { session: snapshotIssuerSession(selected.session), user: projectAdapterUser(selected.user) };
      }),
    updateSession: (update) =>
      ledger.run("adapter-update-session", async () => {
        if (configuration.observation && configuration.observation.type !== "active") throw new IssuerStagingError();
        const previous = await readSession(update.sessionToken);
        if (!previous || (update.userId !== undefined && update.userId !== previous.session.userId)) {
          throw new IssuerStagingError();
        }
        const session = snapshotIssuerSession({ ...previous.session, ...update });
        if (!Number.isFinite(session.expires.valueOf()) || session.expires.valueOf() <= configuration.now()) {
          throw new IssuerStagingError();
        }
        sessions.set(session.sessionToken, session);
        effects.push({ kind: "renew-session", previous: snapshotIssuerSession(previous.session), session });
        return snapshotIssuerSession(session);
      }),
    deleteSession: (token) =>
      ledger.run("adapter-delete-session", async () => {
        if (configuration.observation?.type === "absent") {
          if (token !== configuration.observationToken) throw new IssuerStagingError();
          return null;
        }
        const previous = await readSession(token);
        if (!previous) throw new IssuerStagingError();
        if (
          configuration.observation &&
          effects.some((effect) => effect.kind === "delete-session" || effect.kind === "expire-session")
        )
          throw new IssuerStagingError();
        sessions.set(token, null);
        if (configuration.observation?.type === "expired") {
          effects.push({
            kind: "expire-session",
            session: snapshotIssuerSession(previous.session),
            observation: configuration.observation,
          });
          return snapshotIssuerSession(previous.session);
        }
        effects.push({ kind: "delete-session", session: snapshotIssuerSession(previous.session) });
        return snapshotIssuerSession(previous.session);
      }),
  };
  return Object.freeze({
    adapter,
    witnesses,
    effects,
    stageVerifiedUser(user: IssuerUserRecord) {
      if (users.has(user.id)) throw new IssuerStagingError();
      users.set(user.id, snapshotIssuerUser(user));
    },
    getSelectedUser: (id: string) => ledger.run("selected-user", () => readUser(id)),
  });
}
