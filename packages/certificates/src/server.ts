import fsSync from "node:fs";
import fs from "node:fs/promises";
import { Agent } from "node:https";
import path from "node:path";
import { rootCertificates } from "node:tls";
import axios from "axios";
import { fetch } from "undici";

import { env } from "@homarr/common/env";
import { LoggingAgent } from "@homarr/common/server";
import CacheableLookup from "cacheable-lookup";
import type { LookupOptions } from "node:dns";
import { logger } from "@homarr/log";

const cacheableLookup = new CacheableLookup({
  maxTtl: 6_00,
  errorTtl: 60,
  fallbackDuration: 3600
});

const getCertificateFolder = () => {
  return env.NODE_ENV === "production"
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
    throw new Error(
      "When you want to use custom certificates locally you need to set LOCAL_CERTIFICATE_PATH to an absolute path",
    );
  }

  if (fileName.includes("/")) {
    throw new Error("Invalid file name");
  }

  await fs.writeFile(path.join(folder, fileName), content);
};

export const createCertificateAgentAsync = async () => {
  const customCertificates = await loadCustomRootCertificatesAsync();
  return new LoggingAgent({
    connect: {
      ca: rootCertificates.concat(customCertificates.map((cert) => cert.content)),
      // Override the DNS lookup with the https://www.npmjs.com/package/cacheable-lookup library lookup (see https://github.com/nodejs/undici/issues/2440#issuecomment-2181215481)
      lookup(hostname, lookupOptions, callback) {
        logger.info(`looking up ${hostname} with cacheable lookup`);
        cacheableLookup.lookup(hostname, { all: lookupOptions.all, hints: lookupOptions.hints, family: convertToNodeJsIPFamily(lookupOptions.family) },  (err, address, family) => {
          if (err) {
            logger.error(`DNS Lookup failed for ${hostname}: ${err}`);
          } else {
            logger.info(`Cacheable Lookup for ${hostname}: ${JSON.stringify(address)}, family: ${family}`);
          }
          callback(err, address, family);
        });
      }
    },
    keepAliveTimeout: 10_000, // Keep connection open for 10s
    keepAliveMaxTimeout: 30_000,
    pipelining: 0
  });
};

/**
 * Converts the family
 * @see https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback
 * @param lookupOptionsFamily the family that should be converted
 */
const convertToNodeJsIPFamily = (lookupOptionsFamily: LookupOptions['family']) => {
  switch (lookupOptionsFamily) {
    case 'IPv4': {
      return 4;
    }
    case 'IPv6': {
      return 6;
    }
    default: {
      return undefined;
    }
  }
}

export const createAxiosCertificateInstanceAsync = async () => {
  const customCertificates = await loadCustomRootCertificatesAsync();
  return axios.create({
    httpsAgent: new Agent({
      ca: rootCertificates.concat(customCertificates.map((cert) => cert.content)),
      keepAlive: true
    }),
  });
};

export const fetchWithTrustedCertificatesAsync: typeof fetch = async (url, options) => {
  const agent = await createCertificateAgentAsync();
  return fetch(url, {
    ...options,
    dispatcher: agent,
  });
};
