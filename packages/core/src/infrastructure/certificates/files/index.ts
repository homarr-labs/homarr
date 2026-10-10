import { X509Certificate } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { rootCertificates } from "node:tls";

import { createRootCertificateStore, readCertificateAsync, RootCertificateError } from "./root-certificate";
import type { RootCertificateResources } from "./root-certificate";

export const getCertificateFolder = () => {
  if (process.env.NODE_ENV !== "production") return process.env.LOCAL_CERTIFICATE_PATH;
  return process.env.LOCAL_CERTIFICATE_PATH ?? path.join("/appdata", "trusted-certificates");
};

export const createCertificateFileStore = (resources: RootCertificateResources) => {
  const roots = createRootCertificateStore(resources);
  const folder = resources.folder;
  const loadCustomRootCertificatesAsync = async () => {
    if (!folder) {
      return [];
    }

    await fs.mkdir(folder, { recursive: true });

    const dirContent = await fs.readdir(folder);
    return await Promise.all(
      dirContent
        .filter((file) => file.endsWith(".crt") || file.endsWith(".pem"))
        .map(async (file) => {
          const content = await readCertificateAsync(path.join(folder, file));
          if (!content) return null;
          return { content: content.toString("utf8"), fileName: file };
        }),
    ).then((certificates) => certificates.filter((certificate) => certificate !== null));
  };

  const getAllTrustedCertificatesAsync = async () => {
    const customCertificates = await loadCustomRootCertificatesAsync();
    return rootCertificates.concat(customCertificates.map((cert) => cert.content));
  };

  const removeCustomRootCertificateAsync = async (fileName: string) => {
    if (!/^[\w\-. ]+$/.test(fileName) || fileName === "." || fileName === "..") {
      throw new RootCertificateError("BAD_REQUEST", "Invalid certificate file name");
    }
    if (!folder) {
      return null;
    }

    const existingFiles = await fs.readdir(folder, { withFileTypes: true });
    if (!existingFiles.some((file) => file.isFile() && file.name === fileName)) {
      throw new Error(`File ${fileName} does not exist`);
    }

    const fullPath = path.join(folder, fileName);
    const content = await readCertificateAsync(fullPath);
    if (!content) throw new Error(`File ${fileName} does not exist`);

    await fs.unlink(fullPath);
    try {
      return new X509Certificate(content);
    } catch {
      return null;
    }
  };

  const addCustomRootCertificateAsync = async (fileName: string, content: string) => {
    await roots.ensureCustomRootCertificateAsync(fileName, content);
  };

  return {
    ...roots,
    loadCustomRootCertificatesAsync,
    getAllTrustedCertificatesAsync,
    removeCustomRootCertificateAsync,
    addCustomRootCertificateAsync,
  };
};

export type CertificateFileStore = ReturnType<typeof createCertificateFileStore>;

export const loadCustomRootCertificatesAsync = () =>
  createCertificateFileStore({ folder: getCertificateFolder() }).loadCustomRootCertificatesAsync();

export const getAllTrustedCertificatesAsync = () =>
  createCertificateFileStore({ folder: getCertificateFolder() }).getAllTrustedCertificatesAsync();

export const removeCustomRootCertificateAsync = (fileName: string) =>
  createCertificateFileStore({ folder: getCertificateFolder() }).removeCustomRootCertificateAsync(fileName);

export const addCustomRootCertificateAsync = (fileName: string, content: string) =>
  createCertificateFileStore({ folder: getCertificateFolder() }).addCustomRootCertificateAsync(fileName, content);
