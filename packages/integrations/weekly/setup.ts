import { rootCertificates } from "node:tls";
import { vi } from "vitest";

vi.mock("@homarr/core/infrastructure/certificates", () => ({
  getTrustedCertificateHostnamesAsync: async () => [],
  getAllTrustedCertificatesAsync: async () => rootCertificates,
}));
