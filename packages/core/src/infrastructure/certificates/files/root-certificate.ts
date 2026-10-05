import { createHash, randomUUID, X509Certificate } from "node:crypto";
import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import { createLogger } from "../../logs";
import { getCertificateFolder } from "./index";

const logger = createLogger({ module: "rootCertificate" });
const maxCertificateBytes = 64 * 1024;
const fileNamePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(crt|pem)$/;
const pemPattern = /^\s*-----BEGIN CERTIFICATE-----\s+([A-Za-z0-9+/=][A-Za-z0-9+/=\s]*)-----END CERTIFICATE-----\s*$/;

export class RootCertificateError extends Error {
  constructor(
    public readonly code: "BAD_REQUEST" | "CONFLICT",
    message: string,
  ) {
    super(message);
  }
}

const validateFileName = (fileName: string) => {
  if (fileName.length > 128 || !fileNamePattern.test(fileName)) {
    throw new RootCertificateError("BAD_REQUEST", "Invalid certificate file name");
  }
};

const describeCertificate = (fileName: string, content: Buffer, requireCurrent: boolean) => {
  if (content.length > maxCertificateBytes) {
    throw new RootCertificateError("BAD_REQUEST", "Expected one PEM root CA certificate, at most 64 KiB");
  }
  const pem = pemPattern.exec(content.toString("utf8"));
  if (!pem?.[1]) {
    throw new RootCertificateError("BAD_REQUEST", "Expected one PEM root CA certificate, at most 64 KiB");
  }

  let certificate: X509Certificate;
  try {
    certificate = new X509Certificate(content);
    // Reject extra DER data as well as PEM chains, keys, leaf certificates and non-root CAs.
    const der = Buffer.from(pem[1].replace(/\s/g, ""), "base64");
    if (
      !certificate.raw.equals(der) ||
      !certificate.ca ||
      !certificate.checkIssued(certificate) ||
      !certificate.verify(certificate.publicKey)
    ) {
      throw new Error("Expected a self-signed root CA certificate");
    }
  } catch {
    throw new RootCertificateError("BAD_REQUEST", "Expected a self-signed root CA certificate");
  }

  const validFrom = new Date(certificate.validFrom);
  const validTo = new Date(certificate.validTo);
  const now = Date.now();
  if (requireCurrent && (validFrom.getTime() > now || validTo.getTime() <= now)) {
    throw new RootCertificateError("BAD_REQUEST", "Root CA certificate is not currently valid");
  }

  return {
    fileName,
    sha256: createHash("sha256").update(content).digest("hex"),
    fingerprint256: certificate.fingerprint256,
    ca: true as const,
    validFrom: validFrom.toISOString(),
    validTo: validTo.toISOString(),
  };
};

const hasCode = (error: unknown, code: string) => {
  return error instanceof Error && "code" in error && error.code === code;
};

const readCertificateAsync = async (fullPath: string) => {
  let file;
  try {
    // NONBLOCK prevents opening a FIFO from hanging before the regular-file check.
    file = await fs.open(fullPath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (error) {
    if (hasCode(error, "ENOENT")) return null;
    if (hasCode(error, "ELOOP") || hasCode(error, "ENXIO")) {
      throw new RootCertificateError("CONFLICT", "Certificate path is not a regular file");
    }
    throw error;
  }

  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > maxCertificateBytes) {
      throw new RootCertificateError("CONFLICT", "Certificate path is not a bounded regular file");
    }
    const content = Buffer.alloc(maxCertificateBytes + 1);
    let size = 0;
    while (size < content.length) {
      const { bytesRead } = await file.read(content, size, content.length - size, size);
      if (bytesRead === 0) break;
      size += bytesRead;
    }
    if (size > maxCertificateBytes) {
      throw new RootCertificateError("CONFLICT", "Certificate file exceeds 64 KiB");
    }
    return content.subarray(0, size);
  } finally {
    await file.close();
  }
};

export const getCustomRootCertificateAsync = async (fileName: string) => {
  validateFileName(fileName);
  const folder = getCertificateFolder();
  if (!folder) return null;
  const content = await readCertificateAsync(path.join(folder, fileName));
  if (!content) return null;
  return describeCertificate(fileName, content, false);
};

export const ensureCustomRootCertificateAsync = async (fileName: string, pem: string) => {
  validateFileName(fileName);
  const content = Buffer.from(pem, "utf8");
  const certificate = describeCertificate(fileName, content, true);
  const folder = getCertificateFolder();
  if (!folder) {
    throw new Error("Set LOCAL_CERTIFICATE_PATH to an absolute path to manage local certificates");
  }
  await fs.mkdir(folder, { recursive: true });
  const fullPath = path.join(folder, fileName);
  const existing = await readCertificateAsync(fullPath);
  if (existing) {
    if (!existing.equals(content)) {
      throw new RootCertificateError("CONFLICT", "A different certificate already exists at this file name");
    }
    return { created: false, certificate };
  }

  // Publish a complete file atomically without replacing an existing directory entry.
  const temporaryPath = path.join(folder, `.root-certificate-${randomUUID()}.tmp`);
  const temporaryFile = await fs.open(
    temporaryPath,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o644,
  );
  try {
    try {
      await temporaryFile.writeFile(content);
      await temporaryFile.sync();
    } finally {
      await temporaryFile.close();
    }
    try {
      await fs.link(temporaryPath, fullPath);
    } catch (error) {
      if (!hasCode(error, "EEXIST")) throw error;
      const concurrent = await readCertificateAsync(fullPath);
      if (!concurrent?.equals(content)) {
        throw new RootCertificateError("CONFLICT", "A different certificate already exists at this file name");
      }
      return { created: false, certificate };
    }
    return { created: true, certificate };
  } finally {
    // Cleanup must not turn a published certificate into a failed operation.
    try {
      await fs.unlink(temporaryPath);
    } catch (error) {
      logger.warn("Failed to remove temporary root certificate file", { error });
    }
  }
};
