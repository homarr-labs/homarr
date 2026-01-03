// Coolify API Types based on https://coolify.io/docs/api-reference/api

export interface CoolifyVersion {
  version: string;
}

export interface CoolifyHealthcheck {
  status: string;
}

export interface CoolifyApplication {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  fqdn?: string;
  dockerfile?: string;
  git_repository?: string;
  git_branch?: string;
  environment_id?: number;
  project_id?: number;
  destination_id?: number;
  destination_type?: string;
  server_id?: number | null;
}

export interface CoolifyApplicationLog {
  logs: string;
}

export interface CoolifyEnvironmentVariable {
  id: number;
  key: string;
  value: string;
  is_build_time: boolean;
  is_preview: boolean;
  application_id: number;
}

export interface CoolifyProject {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CoolifyEnvironment {
  id: number;
  uuid?: string;
  name: string;
  project_id: number;
  created_at: string;
  updated_at: string;
}

export interface CoolifyProjectWithEnvironments extends CoolifyProject {
  environments: CoolifyEnvironment[];
}

export interface CoolifyApplicationWithContext extends CoolifyApplication {
  projectName?: string;
  projectUuid?: string;
  environmentName?: string;
  environmentUuid?: string;
}

export interface CoolifyResource {
  id: number;
  uuid: string;
  name: string;
  type: string;
  status: string;
}

export interface CoolifyServerSettings {
  server_id?: number;
  is_build_server?: boolean;
  is_reachable?: boolean;
  is_usable?: boolean;
}

export interface CoolifyServer {
  id: number | null;
  uuid: string;
  name: string;
  description?: string;
  ip: string;
  port?: number;
  user?: string;
  is_reachable?: boolean;
  is_usable?: boolean;
  created_at: string;
  updated_at: string;
  settings?: CoolifyServerSettings;
}

export interface CoolifyService {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  status?: string;
  environment_id?: number;
  destination_id?: number;
  destination_type?: string;
  server_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CoolifyServiceWithContext extends CoolifyService {
  projectName?: string;
  projectUuid?: string;
  environmentName?: string;
  environmentUuid?: string;
}

// Aggregated information for the Coolify instance
export interface CoolifyInstanceInfo {
  version: string;
  applications: CoolifyApplicationWithContext[];
  services: CoolifyServiceWithContext[];
  servers: CoolifyServer[];
}
