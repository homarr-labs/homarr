import { and, eq } from "drizzle-orm";

import type { PersistenceRuntime } from "./runtime";

export const createTrustedCertificateHostnameStore = (runtime: Pick<PersistenceRuntime, "runAsync">) => ({
  listAsync: () => runtime.runAsync((database, schema) => database.select().from(schema.trustedCertificateHostnames)),
  async addAsync(grant: { hostname: string; thumbprint: string; certificate: string }) {
    await runtime.runAsync((database, schema) => database.insert(schema.trustedCertificateHostnames).values(grant));
  },
  async removeAsync(hostname: string, thumbprint: string) {
    await runtime.runAsync((database, schema) =>
      database
        .delete(schema.trustedCertificateHostnames)
        .where(
          and(
            eq(schema.trustedCertificateHostnames.hostname, hostname),
            eq(schema.trustedCertificateHostnames.thumbprint, thumbprint),
          ),
        ),
    );
  },
  async removeByFingerprintAsync(thumbprint: string) {
    await runtime.runAsync((database, schema) =>
      database
        .delete(schema.trustedCertificateHostnames)
        .where(eq(schema.trustedCertificateHostnames.thumbprint, thumbprint)),
    );
  },
});
