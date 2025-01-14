import { X509Certificate } from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { rootCertificates } from "node:tls";
import { Agent, fetch } from "undici";

export const loadCustomRootCertificatesAsync = async () => {
  const folder =
    process.env.NODE_ENV === "production"
      ? path.join("/appdata", "trusted-certificates")
      : process.env.LOCAL_CERTIFICATE_PATH;

  if (!folder) {
    return [];
  }

  if (!fsSync.existsSync(folder)) {
    await fs.mkdir(folder, { recursive: true });
  }

  const dirContent = await fs.readdir(folder);
  const certificates = await Promise.all(
    dirContent
      .filter((file) => file.endsWith(".crt"))
      .map(async (file) => ({
        content: await fs.readFile(path.join(folder, file), "utf8"),
        fileName: file,
      })),
  );
  return certificates.map(({ content, fileName }) => ({
    base64: content,
    x509: new X509Certificate(content),
    fileName,
  }));
};

export const fetchWithTrustedCertificatesAsync: typeof fetch = async (url, options) => {
  const agent = new Agent({
    connect: {
      ca: [...rootCertificates],
    },
  });
  return fetch(url, {
    ...options,
    dispatcher: agent,
  });
};
