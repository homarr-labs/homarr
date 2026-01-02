// Coolify API Types based on https://coolify.io/docs/api-reference/api

export interface CoolifyVersion {
  version: string;
}

export interface CoolifyHealthcheck {
  status: string;
}

export interface CoolifyApplication {
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

export interface CoolifyResource {
  id: number;
  uuid: string;
  name: string;
  type: string;
  status: string;
}

export interface CoolifyServer {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  ip: string;
  port?: number;
  user?: string;
  created_at: string;
  updated_at: string;
}

export interface CoolifyService {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  environment_id?: number;
  created_at: string;
  updated_at: string;
}

// Aggregated information for the Coolify instance
export interface CoolifyInstanceInfo {
  version: string;
  applications: CoolifyApplication[];
  projects: CoolifyProject[];
  servers: CoolifyServer[];
  services: CoolifyService[];
  resources: CoolifyResource[];
}
