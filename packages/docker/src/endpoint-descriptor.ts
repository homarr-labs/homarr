export const dockerEndpointCapabilities = ["inventory", "logs", "lifecycle", "remove"] as const;
export type DockerEndpointCapability = (typeof dockerEndpointCapabilities)[number];

export type DockerEndpointTransport =
  | { type: "socket"; path: string }
  | { type: "tcp"; host: string; port: number; allowInsecure: true }
  | {
      type: "tls";
      host: string;
      port: number;
      caPath: string;
      certPath?: string;
      keyPath?: string;
    };

export interface DockerEndpointDescriptor {
  id: string;
  name: string;
  kind: "docker" | "podman";
  transport: DockerEndpointTransport;
  capabilities: DockerEndpointCapability[];
  scope: "admin";
  source: "environment" | "legacy" | "default";
}

const allCapabilities = [...dockerEndpointCapabilities];

export const parseDockerEndpointDescriptors = (value: string): DockerEndpointDescriptor[] => {
  let input: unknown;
  try {
    input = JSON.parse(value);
  } catch (error) {
    throw new Error("DOCKER_ENDPOINTS must be valid JSON", { cause: error });
  }
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("DOCKER_ENDPOINTS must be a non-empty JSON array");
  }

  const descriptors = input.map((entry, index) => parseDescriptor(entry, index));
  const ids = new Set(descriptors.map(({ id }) => id));
  if (ids.size !== descriptors.length) throw new Error("DOCKER_ENDPOINTS ids must be unique");
  return descriptors;
};

const parseDescriptor = (value: unknown, index: number): DockerEndpointDescriptor => {
  const entry = getRecord(value, `DOCKER_ENDPOINTS[${index}]`);
  const id = getNonEmptyString(entry.id, `DOCKER_ENDPOINTS[${index}].id`);
  const name = getNonEmptyString(entry.name, `DOCKER_ENDPOINTS[${index}].name`);
  const kind =
    entry.kind === "podman" ? "podman" : entry.kind === "docker" || entry.kind === undefined ? "docker" : null;
  if (!kind) throw new Error(`DOCKER_ENDPOINTS[${index}].kind must be docker or podman`);
  const transport = parseTransport(entry.transport, index);
  const capabilities = parseCapabilities(entry.capabilities, index);

  return { id, name, kind, transport, capabilities, scope: "admin", source: "environment" };
};

const parseTransport = (value: unknown, index: number): DockerEndpointTransport => {
  const transport = getRecord(value, `DOCKER_ENDPOINTS[${index}].transport`);
  if (transport.type === "socket") {
    return { type: "socket", path: getAbsolutePath(transport.path, `DOCKER_ENDPOINTS[${index}].transport.path`) };
  }
  if (transport.type === "tcp") {
    if (transport.allowInsecure !== true) {
      throw new Error(`DOCKER_ENDPOINTS[${index}] plaintext TCP requires allowInsecure: true`);
    }
    return {
      type: "tcp",
      host: getNonEmptyString(transport.host, `DOCKER_ENDPOINTS[${index}].transport.host`),
      port: getPort(transport.port, index),
      allowInsecure: true,
    };
  }
  if (transport.type === "tls") {
    const certPath = getOptionalAbsolutePath(transport.certPath, `DOCKER_ENDPOINTS[${index}].transport.certPath`);
    const keyPath = getOptionalAbsolutePath(transport.keyPath, `DOCKER_ENDPOINTS[${index}].transport.keyPath`);
    if (Boolean(certPath) !== Boolean(keyPath)) {
      throw new Error(`DOCKER_ENDPOINTS[${index}] TLS certPath and keyPath must be provided together`);
    }
    return {
      type: "tls",
      host: getNonEmptyString(transport.host, `DOCKER_ENDPOINTS[${index}].transport.host`),
      port: getPort(transport.port, index),
      caPath: getAbsolutePath(transport.caPath, `DOCKER_ENDPOINTS[${index}].transport.caPath`),
      ...(certPath && keyPath ? { certPath, keyPath } : {}),
    };
  }
  throw new Error(`DOCKER_ENDPOINTS[${index}].transport.type must be socket, tcp, or tls`);
};

const parseCapabilities = (value: unknown, index: number): DockerEndpointCapability[] => {
  if (value === undefined) return [...allCapabilities];
  if (!Array.isArray(value) || value.some((capability) => !dockerEndpointCapabilities.includes(capability))) {
    throw new Error(`DOCKER_ENDPOINTS[${index}].capabilities contains an unsupported capability`);
  }
  const capabilities = [...new Set(value)] as DockerEndpointCapability[];
  if (!capabilities.includes("inventory")) {
    throw new Error(`DOCKER_ENDPOINTS[${index}].capabilities must include inventory`);
  }
  return capabilities;
};

const getRecord = (value: unknown, path: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must be an object`);
  return value as Record<string, unknown>;
};

const getNonEmptyString = (value: unknown, path: string) => {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${path} must be a non-empty string`);
  return value.trim();
};

const getAbsolutePath = (value: unknown, path: string) => {
  const result = getNonEmptyString(value, path);
  if (!result.startsWith("/")) throw new Error(`${path} must be an absolute path`);
  return result;
};

const getOptionalAbsolutePath = (value: unknown, path: string) =>
  value === undefined ? undefined : getAbsolutePath(value, path);

const getPort = (value: unknown, index: number) => {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 65_535) {
    throw new Error(`DOCKER_ENDPOINTS[${index}].transport.port must be an integer from 1 to 65535`);
  }
  return Number(value);
};

export const getDockerEndpointHost = (descriptor: DockerEndpointDescriptor) =>
  descriptor.transport.type === "socket"
    ? descriptor.transport.path
    : `${descriptor.transport.host}:${descriptor.transport.port}`;

export const createLegacySocketDescriptor = (path: string): DockerEndpointDescriptor => ({
  id: `socket:${path}`,
  name: path,
  kind: path.toLowerCase().includes("podman") ? "podman" : "docker",
  transport: { type: "socket", path },
  capabilities: [...allCapabilities],
  scope: "admin",
  source: "legacy",
});

export const createLegacyTcpDescriptor = (host: string, port: number): DockerEndpointDescriptor => ({
  id: `tcp:${host}:${port}`,
  name: `${host}:${port}`,
  kind: "docker",
  transport: { type: "tcp", host, port, allowInsecure: true },
  capabilities: [...allCapabilities],
  scope: "admin",
  source: "legacy",
});
