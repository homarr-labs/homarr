import type { Adapter, AdapterSession, AdapterUser } from "@auth/core/adapters";

export type AdapterCall = {
  requestId: string;
  method: string;
  userId?: string;
  sessionToken?: string;
};

const copySession = (session: AdapterSession): AdapterSession => ({ ...session, expires: new Date(session.expires) });

export function createMemoryStore(identities: AdapterUser[]) {
  const users = new Map(identities.map((user) => [user.id, { ...user }]));
  const sessions = new Map<string, AdapterSession>();
  const calls: AdapterCall[] = [];

  const forRequest = (requestId: string) => {
    const record = (method: string, values: Omit<AdapterCall, "requestId" | "method"> = {}) => {
      calls.push({ requestId, method, ...values });
    };
    return {
      createUser(user) {
        record("createUser", { userId: user.id });
        if (users.has(user.id)) throw new Error("Duplicate disposable identity");
        users.set(user.id, { ...user });
        return { ...user };
      },
      getUser(id) {
        record("getUser", { userId: id });
        const user = users.get(id);
        return user ? { ...user } : null;
      },
      getUserByEmail(email) {
        record("getUserByEmail");
        const user = [...users.values()].find((candidate) => candidate.email === email);
        return user ? { ...user } : null;
      },
      getUserByAccount() {
        record("getUserByAccount");
        throw new Error("Account linking outside this probe");
      },
      updateUser(patch) {
        record("updateUser", { userId: patch.id });
        const user = users.get(patch.id);
        if (!user) throw new Error("Unknown disposable identity");
        const updated = { ...user, ...patch };
        users.set(user.id, updated);
        return { ...updated };
      },
      linkAccount() {
        record("linkAccount");
        throw new Error("Account linking outside this probe");
      },
      createSession(session) {
        record("createSession", { userId: session.userId, sessionToken: session.sessionToken });
        if (!users.has(session.userId) || sessions.has(session.sessionToken))
          throw new Error("Invalid disposable session creation");
        sessions.set(session.sessionToken, copySession(session));
        return copySession(session);
      },
      getSessionAndUser(token) {
        record("getSessionAndUser", { sessionToken: token });
        const session = sessions.get(token);
        const user = session ? users.get(session.userId) : undefined;
        return session && user ? { session: copySession(session), user: { ...user } } : null;
      },
      updateSession(patch) {
        record("updateSession", { sessionToken: patch.sessionToken });
        const session = sessions.get(patch.sessionToken);
        if (!session) return null;
        const updated = copySession({ ...session, ...patch });
        sessions.set(updated.sessionToken, updated);
        return copySession(updated);
      },
      deleteSession(token) {
        record("deleteSession", { sessionToken: token });
        const session = sessions.get(token);
        sessions.delete(token);
        return session ? copySession(session) : null;
      },
    } satisfies Adapter;
  };

  return { users, sessions, calls, forRequest };
}

export type MemoryStore = ReturnType<typeof createMemoryStore>;
