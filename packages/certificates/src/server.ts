import { X509Certificate } from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import type { AgentOptions } from "node:https";
import { Agent as HttpsAgent } from "node:https";
import path from "node:path";
import { checkServerIdentity, rootCertificates } from "node:tls";
import axios from "axios";
import { fetch } from "undici";

import { env } from "@homarr/common/env";
import { LoggingAgent } from "@homarr/common/server";
import type { InferSelectModel } from "@homarr/db";
import { db } from "@homarr/db";
import type { trustedCertificateHostnames } from "@homarr/db/schema";

const getCertificateFolder = () => {
  if (env.NODE_ENV !== "production") return process.env.LOCAL_CERTIFICATE_PATH;
  return process.env.LOCAL_CERTIFICATE_PATH ?? path.join("/appdata", "trusted-certificates");
};

export const loadCustomRootCertificatesAsync = async () => {
  const folder = getCertificateFolder();

  if (!folder) {
    return [];
  }

  if (!fsSync.existsSync(folder)) {
    await fs.mkdir(folder, { recursive: true });
  }

  const dirContent = await fs.readdir(folder);
  return await Promise.all(
    dirContent
      .filter((file) => file.endsWith(".crt") || file.endsWith(".pem"))
      .map(async (file) => ({
        content: await fs.readFile(path.join(folder, file), "utf8"),
        fileName: file,
      })),
  );
};

export const removeCustomRootCertificateAsync = async (fileName: string) => {
  const folder = getCertificateFolder();
  if (!folder) {
    return null;
  }

  const existingFiles = await fs.readdir(folder, { withFileTypes: true });
  if (!existingFiles.some((file) => file.isFile() && file.name === fileName)) {
    throw new Error(`File ${fileName} does not exist`);
  }

  const fullPath = path.join(folder, fileName);
  const content = await fs.readFile(fullPath, "utf8");

  await fs.rm(fullPath);
  try {
    return new X509Certificate(content);
  } catch {
    return null;
  }
};

export const addCustomRootCertificateAsync = async (fileName: string, content: string) => {
  const folder = getCertificateFolder();
  if (!folder) {
    throw new Error(
      "When you want to use custom certificates locally you need to set LOCAL_CERTIFICATE_PATH to an absolute path",
    );
  }

  if (fileName.includes("/")) {
    throw new Error("Invalid file name");
  }

  await fs.writeFile(path.join(folder, fileName), content);
};

export const getTrustedCertificateHostnamesAsync = async () => {
  return await db.query.trustedCertificateHostnames.findMany();
};

export const getAllTrustedCertificatesAsync = async () => {
  const customCertificates = await loadCustomRootCertificatesAsync();
  return rootCertificates.concat(customCertificates.map((cert) => cert.content));
};

export const createCustomCheckServerIdentity = (
  trustedHostnames: InferSelectModel<typeof trustedCertificateHostnames>[],
): typeof checkServerIdentity => {
  return (hostname, peerCertificate) => {
    const matchingTrustedHostnames = trustedHostnames.filter(
      (cert) => cert.thumbprint === peerCertificate.fingerprint256,
    );

    // We trust the certificate if we have a matching hostname
    if (matchingTrustedHostnames.some((cert) => cert.hostname === hostname)) return undefined;

    return checkServerIdentity(hostname, peerCertificate);
  };
};

export const createCertificateAgentAsync = async (override?: {
  ca: string | string[];
  checkServerIdentity: typeof checkServerIdentity;
}) => {
  return new LoggingAgent({
    connect: override ?? {
      ca: await getAllTrustedCertificatesAsync(),
      checkServerIdentity: createCustomCheckServerIdentity(await getTrustedCertificateHostnamesAsync()),
    },
  });
};

export const createHttpsAgentAsync = async (override?: Pick<AgentOptions, "ca" | "checkServerIdentity">) => {
  return new HttpsAgent(
    override ?? {
      ca: await getAllTrustedCertificatesAsync(),
      checkServerIdentity: createCustomCheckServerIdentity(await getTrustedCertificateHostnamesAsync()),
    },
  );
};

export const createAxiosCertificateInstanceAsync = async (
  override?: Pick<AgentOptions, "ca" | "checkServerIdentity">,
) => {
  return axios.create({
    httpsAgent: await createHttpsAgentAsync(override),
  });
};

export const fetchWithTrustedCertificatesAsync: typeof fetch = async (url, options) => {
  const agent = await createCertificateAgentAsync();
  return fetch(url, {
    ...options,
    dispatcher: agent,
  });
};
