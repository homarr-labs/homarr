import { getWorkerId, verifyIdentity } from "./crypto";

/** Sent through the encrypted owner session; returned signature is public proof only. */
export interface EnrollmentChallenge {
  version: 1;
  type: "homarr-platform-enrollment";
  challengeId: string;
  nonce: string;
  userId: string;
  audience: string;
  expiresAt: number;
}

export interface WorkerEnrollmentProof {
  challenge: EnrollmentChallenge;
  workerId: string;
  workerPublicKey: JsonWebKey;
  workerSigningKey: JsonWebKey;
  /** ECDSA P-256 SHA-256 signature over enrollmentMessage(), base64url encoded. */
  signature: string;
}

/** Stable, explicit field ordering shared by browser, worker, and platform. */
export function enrollmentMessage(enrollment: Omit<WorkerEnrollmentProof, "signature">): string {
  const { challenge, workerId, workerPublicKey, workerSigningKey } = enrollment;
  return JSON.stringify({
    version: 1,
    type: "homarr-platform-enrollment",
    challengeId: challenge.challengeId,
    nonce: challenge.nonce,
    userId: challenge.userId,
    audience: challenge.audience,
    expiresAt: challenge.expiresAt,
    workerId,
    workerPublicKey: { kty: "EC", crv: "P-256", x: workerPublicKey.x, y: workerPublicKey.y },
    workerSigningKey: { kty: "EC", crv: "P-256", x: workerSigningKey.x, y: workerSigningKey.y },
  });
}

export async function verifyEnrollmentSignature(enrollment: WorkerEnrollmentProof): Promise<boolean> {
  try {
    if ((await getWorkerId(enrollment.workerSigningKey)) !== enrollment.workerId) return false;
    return await verifyIdentity(enrollment.workerSigningKey, enrollmentMessage(enrollment), enrollment.signature);
  } catch {
    return false;
  }
}

export function isEnrollmentChallenge(value: unknown): value is EnrollmentChallenge {
  if (value === null || typeof value !== "object") return false;
  const challenge = value as EnrollmentChallenge;
  return challenge.version === 1 && challenge.type === "homarr-platform-enrollment";
}
