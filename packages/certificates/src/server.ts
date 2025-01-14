import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { rootCertificates } from "node:tls";
import { Agent, fetch } from "undici";

const getCertificateFolder = () => {
  return process.env.NODE_ENV === "production"
    ? path.join("/appdata", "trusted-certificates")
    : process.env.LOCAL_CERTIFICATE_PATH;
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
      .filter((file) => file.endsWith(".crt"))
      .map(async (file) => ({
        content: await fs.readFile(path.join(folder, file), "utf8"),
        fileName: file,
      })),
  );
};

export const removeCustomRootCertificateAsync = async (fileName: string) => {
  const folder = getCertificateFolder();
  if (!folder) {
    return;
  }

  await fs.rm(path.join(folder, fileName));
};

export const addCustomRootCertificateAsync = async (fileName: string, content: string) => {
  const folder = getCertificateFolder();
  if (!folder) {
    return;
  }

  if (fileName.includes("/")) {
    throw new Error("Invalid file name");
  }

  await fs.writeFile(path.join(folder, fileName), content);
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
