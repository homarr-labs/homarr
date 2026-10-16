import {
  fromBase64Url,
  getWorkerId,
  MAX_FRAME_BYTES,
  publicIdentityJwk,
  randomSecret,
  signIdentity,
  toBase64Url,
  utf8,
  verifyIdentity,
} from "./crypto";
import type { WorkerIdentity } from "./crypto";

export const PROTOCOL_VERSION = 1;
const MAX_HANDSHAKE_BYTES = 16_384;
const MAX_SESSION_FRAMES = 0x1_0000_0000;

type ClientHello = { v: 1; type: "client-hello"; workerId: string; nonce: string; ephemeral: JsonWebKey };
type ServerHello = {
  v: 1;
  type: "server-hello";
  sessionId: string;
  nonce: string;
  ephemeral: JsonWebKey;
  identity: JsonWebKey;
  signature: string;
};
export interface VerifiedDevice {
  sessionId: string;
  deviceId: string;
  devicePublicJwk: JsonWebKey;
}

function jsonObject(frame: string, maximum = MAX_FRAME_BYTES): Record<string, unknown> {
  if (typeof frame !== "string" || frame.length > maximum || utf8(frame).length > maximum)
    throw new Error("Invalid frame size");
  const value: unknown = JSON.parse(frame);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid protocol frame");
  return value as Record<string, unknown>;
}

function nonce(value: unknown): string {
  if (typeof value !== "string" || fromBase64Url(value, 32).length !== 32) throw new Error("Invalid handshake nonce");
  return value;
}

async function ephemeralKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
}

function transcript(client: ClientHello, server: Omit<ServerHello, "signature">): string {
  // Fixed position arrays avoid ambiguous object ordering or unconstrained JSON canonicalization.
  return JSON.stringify([
    "homarr-remote-handshake-v1",
    client.workerId,
    client.nonce,
    [client.ephemeral.x, client.ephemeral.y],
    server.sessionId,
    server.nonce,
    [server.ephemeral.x, server.ephemeral.y],
    [server.identity.x, server.identity.y],
  ]);
}

export class EncryptedChannel {
  private outgoingSequence = 0;
  private incomingSequence = 0;
  private outgoingQueue = Promise.resolve();
  private incomingQueue = Promise.resolve();
  private closed = false;
  constructor(
    readonly sessionId: string,
    readonly transcriptHash: string,
    private readonly outgoingKey: CryptoKey,
    private readonly incomingKey: CryptoKey,
    private readonly outgoingDirection: "browser-to-worker" | "worker-to-browser",
    private readonly incomingDirection: "browser-to-worker" | "worker-to-browser",
  ) {}

  close(): void {
    this.closed = true;
  }

  encrypt(value: unknown): Promise<string> {
    const task = this.outgoingQueue.then(async () => {
      if (this.closed || this.outgoingSequence >= MAX_SESSION_FRAMES) throw new Error("Channel closed");
      const plaintext = utf8(JSON.stringify(value));
      if (plaintext.length > 700_000) throw new Error("Encrypted message too large");
      const sequence = this.outgoingSequence++;
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: this.iv(sequence),
          additionalData: this.aad(this.outgoingDirection, sequence),
          tagLength: 128,
        },
        this.outgoingKey,
        plaintext,
      );
      return JSON.stringify({
        v: 1,
        type: "encrypted",
        sessionId: this.sessionId,
        sequence,
        ciphertext: toBase64Url(new Uint8Array(ciphertext)),
      });
    });
    this.outgoingQueue = task.then(
      () => undefined,
      () => {
        this.close();
      },
    );
    return task;
  }

  decrypt(frame: string): Promise<unknown> {
    const task = this.incomingQueue.then(async () => {
      if (this.closed) throw new Error("Channel closed");
      const value = jsonObject(frame);
      if (
        value.v !== 1 ||
        value.type !== "encrypted" ||
        value.sessionId !== this.sessionId ||
        value.sequence !== this.incomingSequence ||
        typeof value.ciphertext !== "string" ||
        this.incomingSequence >= MAX_SESSION_FRAMES
      ) {
        throw new Error("Invalid or replayed encrypted frame");
      }
      const sequence = this.incomingSequence;
      const ciphertext = fromBase64Url(value.ciphertext, 700_016);
      if (ciphertext.length < 16) throw new Error("Invalid encrypted frame");
      const plaintext = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: this.iv(sequence),
          additionalData: this.aad(this.incomingDirection, sequence),
          tagLength: 128,
        },
        this.incomingKey,
        ciphertext,
      );
      const result: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext));
      this.incomingSequence++;
      return result;
    });
    this.incomingQueue = task.then(
      () => undefined,
      () => {
        this.close();
      },
    );
    return task;
  }

  private iv(sequence: number): Uint8Array<ArrayBuffer> {
    const result = new Uint8Array(12);
    new DataView(result.buffer).setBigUint64(4, BigInt(sequence));
    return result;
  }
  private aad(direction: string, sequence: number): Uint8Array<ArrayBuffer> {
    return utf8(JSON.stringify(["homarr-remote-frame-v1", this.sessionId, direction, sequence]));
  }
}

async function deriveChannel(
  privateKey: CryptoKey,
  peerJwk: JsonWebKey,
  text: string,
  sessionId: string,
  browser: boolean,
): Promise<EncryptedChannel> {
  // WebCrypto's P-256 import validates the point and rejects invalid/off-curve public keys.
  const peerKey = await crypto.subtle.importKey(
    "jwk",
    publicIdentityJwk(peerJwk),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const secret = await crypto.subtle.deriveBits({ name: "ECDH", public: peerKey }, privateKey, 256);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(text)));
  const rootKey = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveKey"]);
  new Uint8Array(secret).fill(0);
  async function key(direction: string): Promise<CryptoKey> {
    return crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: hash, info: utf8(`homarr-remote-v1/${direction}`) },
      rootKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }
  const [toWorker, toBrowser] = await Promise.all([key("browser-to-worker"), key("worker-to-browser")]);
  if (browser)
    return new EncryptedChannel(
      sessionId,
      toBase64Url(hash),
      toWorker,
      toBrowser,
      "browser-to-worker",
      "worker-to-browser",
    );
  return new EncryptedChannel(
    sessionId,
    toBase64Url(hash),
    toBrowser,
    toWorker,
    "worker-to-browser",
    "browser-to-worker",
  );
}

export async function createBrowserHandshake(options: { pinnedIdentity: JsonWebKey; workerId?: string }): Promise<{
  hello: string;
  accept(frame: string): Promise<EncryptedChannel>;
}> {
  const pin = publicIdentityJwk(options.pinnedIdentity);
  const workerId = await getWorkerId(pin);
  if (options.workerId !== undefined && options.workerId !== workerId)
    throw new Error("Pinned worker identity mismatch");
  const pair = await ephemeralKeyPair();
  const client: ClientHello = {
    v: 1,
    type: "client-hello",
    workerId,
    nonce: randomSecret(),
    ephemeral: publicIdentityJwk(await crypto.subtle.exportKey("jwk", pair.publicKey)),
  };
  let consumed = false;
  return {
    hello: JSON.stringify(client),
    async accept(frame) {
      if (consumed) throw new Error("Handshake already consumed");
      consumed = true;
      const raw = jsonObject(frame, MAX_HANDSHAKE_BYTES);
      if (raw.v !== 1 || raw.type !== "server-hello" || typeof raw.signature !== "string")
        throw new Error("Invalid worker handshake");
      const server: ServerHello = {
        v: 1,
        type: "server-hello",
        sessionId: nonce(raw.sessionId),
        nonce: nonce(raw.nonce),
        ephemeral: publicIdentityJwk(raw.ephemeral),
        identity: publicIdentityJwk(raw.identity),
        signature: raw.signature,
      };
      if (server.identity.x !== pin.x || server.identity.y !== pin.y)
        throw new Error("Worker identity does not match pin");
      const text = transcript(client, server);
      if (!(await verifyIdentity(pin, text, server.signature))) throw new Error("Worker handshake signature invalid");
      return deriveChannel(pair.privateKey, server.ephemeral, text, server.sessionId, true);
    },
  };
}

export async function acceptBrowserHandshake(
  frame: string,
  identity: WorkerIdentity,
): Promise<{ hello: string; channel: EncryptedChannel }> {
  const raw = jsonObject(frame, MAX_HANDSHAKE_BYTES);
  if (
    raw.v !== 1 ||
    raw.type !== "client-hello" ||
    typeof raw.workerId !== "string" ||
    raw.workerId !== (await getWorkerId(identity.publicJwk))
  )
    throw new Error("Invalid browser handshake");
  const client: ClientHello = {
    v: 1,
    type: "client-hello",
    workerId: raw.workerId,
    nonce: nonce(raw.nonce),
    ephemeral: publicIdentityJwk(raw.ephemeral),
  };
  const pair = await ephemeralKeyPair();
  const server: Omit<ServerHello, "signature"> = {
    v: 1,
    type: "server-hello",
    sessionId: randomSecret(),
    nonce: randomSecret(),
    ephemeral: publicIdentityJwk(await crypto.subtle.exportKey("jwk", pair.publicKey)),
    identity: publicIdentityJwk(identity.publicJwk),
  };
  const text = transcript(client, server);
  // Derivation also validates the peer ECDH point before emitting any response.
  const channel = await deriveChannel(pair.privateKey, client.ephemeral, text, server.sessionId, false);
  return { hello: JSON.stringify({ ...server, signature: await signIdentity(identity, text) }), channel };
}

export async function createClientConfirmation(
  channel: EncryptedChannel,
  credential: unknown,
  identity: WorkerIdentity,
): Promise<string> {
  const proof = JSON.stringify(["homarr-remote-device-v1", channel.transcriptHash]);
  return channel.encrypt({
    type: "client-confirm",
    credential,
    devicePublicJwk: publicIdentityJwk(identity.publicJwk),
    signature: await signIdentity(identity, proof),
  });
}

export async function verifyClientConfirmation(
  channel: EncryptedChannel,
  frame: string,
): Promise<{ credential: unknown; device: VerifiedDevice }> {
  const raw = await channel.decrypt(frame);
  if (!raw || typeof raw !== "object") throw new Error("Invalid device confirmation");
  const value = raw as Record<string, unknown>;
  if (value.type !== "client-confirm" || typeof value.signature !== "string")
    throw new Error("Invalid device confirmation");
  const devicePublicJwk = publicIdentityJwk(value.devicePublicJwk);
  const proof = JSON.stringify(["homarr-remote-device-v1", channel.transcriptHash]);
  if (!(await verifyIdentity(devicePublicJwk, proof, value.signature)))
    throw new Error("Device confirmation signature invalid");
  return {
    credential: value.credential,
    device: { sessionId: channel.sessionId, deviceId: await getWorkerId(devicePublicJwk), devicePublicJwk },
  };
}
