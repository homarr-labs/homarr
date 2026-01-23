import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type {
  CoolifyApplication,
  CoolifyApplicationWithContext,
  CoolifyEnvironment,
  CoolifyEnvironmentVariable,
  CoolifyHealthcheck,
  CoolifyInstanceInfo,
  CoolifyProject,
  CoolifyProjectWithEnvironments,
  CoolifyResource,
  CoolifyServer,
  CoolifyService,
  CoolifyServiceWithContext,
} from "./coolify-types";
import {
  coolifyApplicationLogSchema,
  coolifyApplicationSchema,
  coolifyEnvironmentSchema,
  coolifyEnvironmentVariableSchema,
  coolifyHealthcheckSchema,
  coolifyProjectSchema,
  coolifyProjectWithEnvironmentsSchema,
  coolifyResourceSchema,
  coolifyServerSchema,
  coolifyServiceSchema,
} from "./coolify-types";

export class CoolifyIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const healthUrl = this.url("/api/health");
    const healthResponse = await input.fetchAsync(healthUrl, {});

    if (!healthResponse.ok) {
      throw new ResponseError(healthResponse);
    }

    // Test API key authentication
    const versionUrl = this.url("/api/v1/version");
    const versionResponse = await input.fetchAsync(versionUrl, {
      headers: this.getAuthHeaders(),
    });

    if (!versionResponse.ok) {
      throw new ResponseError(versionResponse);
    }

    return { success: true };
  }

  /**
   * Get Coolify version information
   * https://coolify.io/docs/api-reference/api/operations/version
   */
  public async getVersionAsync(): Promise<string> {
    const url = this.url("/api/v1/version");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const version = await response.text();
    return version.trim();
  }

  /**
   * Get Coolify healthcheck status
   * https://coolify.io/docs/api-reference/api/operations/healthcheck
   */
  public async getHealthcheckAsync(): Promise<CoolifyHealthcheck> {
    const url = this.url("/api/v1/healthcheck");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return coolifyHealthcheckSchema.parse(await response.json());
  }

  /**
   * List all applications
   * https://coolify.io/docs/api-reference/api/operations/list-applications
   */
  public async listApplicationsAsync(): Promise<CoolifyApplication[]> {
    const url = this.url("/api/v1/applications");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return coolifyApplicationSchema.array().parse(await response.json());
  }

  /**
   * Get application by UUID
   * https://coolify.io/docs/api-reference/api/operations/get-application-by-uuid
   */
  public async getApplicationByUuidAsync(uuid: string): Promise<CoolifyApplication> {
    const url = this.url(`/api/v1/applications/${uuid}`);
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return coolifyApplicationSchema.parse(await response.json());
  }

  /**
   * Get application logs by UUID
   * https://coolify.io/docs/api-reference/api/operations/get-application-logs-by-uuid
   */
  public async getApplicationLogsAsync(uuid: string): Promise<string> {
    const url = this.url(`/api/v1/applications/${uuid}/logs`);
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const result = coolifyApplicationLogSchema.parse(await response.json());
    return result.logs;
  }

  /**
   * List environment variables by application UUID
   * https://coolify.io/docs/api-reference/api/operations/list-envs-by-application-uuid
   */
  public async listEnvsByApplicationUuidAsync(uuid: string): Promise<CoolifyEnvironmentVariable[]> {
    const url = this.url(`/api/v1/applications/${uuid}/envs`);
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return coolifyEnvironmentVariableSchema.array().parse(await response.json());
  }

  /**
   * List projects
   * https://coolify.io/docs/api-reference/api/operations/list-projects
   */
  public async listProjectsAsync(): Promise<CoolifyProject[]> {
    const url = this.url("/api/v1/projects");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return coolifyProjectSchema.array().parse(await response.json());
  }

  /**
   * Get project by UUID (includes environments)
   * https://coolify.io/docs/api-reference/api/operations/get-project-by-uuid
   */
  public async getProjectByUuidAsync(uuid: string): Promise<CoolifyProjectWithEnvironments> {
    const url = this.url(`/api/v1/projects/${uuid}`);
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return coolifyProjectWithEnvironmentsSchema.parse(await response.json());
  }

  /**
   * Get environments
   * https://coolify.io/docs/api-reference/api/operations/get-environments
   */
  public async getEnvironmentsAsync(): Promise<CoolifyEnvironment[]> {
    const url = this.url("/api/v1/environments");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return coolifyEnvironmentSchema.array().parse(await response.json());
  }

  /**
   * Get environment by name or UUID
   * https://coolify.io/docs/api-reference/api/operations/get-environment-by-name-or-uuid
   */
  public async getEnvironmentByNameOrUuidAsync(nameOrUuid: string): Promise<CoolifyEnvironment> {
    const url = this.url(`/api/v1/environments/${nameOrUuid}`);
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return coolifyEnvironmentSchema.parse(await response.json());
  }

  /**
   * List resources
   * https://coolify.io/docs/api-reference/api/operations/list-resources
   */
  public async listResourcesAsync(): Promise<CoolifyResource[]> {
    const url = this.url("/api/v1/resources");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return coolifyResourceSchema.array().parse(await response.json());
  }

  /**
   * List servers
   * https://coolify.io/docs/api-reference/api/operations/list-servers
   */
  public async listServersAsync(): Promise<CoolifyServer[]> {
    const url = this.url("/api/v1/servers");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return coolifyServerSchema.array().parse(await response.json());
  }

  /**
   * List services
   * https://coolify.io/docs/api-reference/api/operations/list-services
   */
  public async listServicesAsync(): Promise<CoolifyService[]> {
    const url = this.url("/api/v1/services");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return coolifyServiceSchema.array().parse(await response.json());
  }

  public async getInstanceInfoAsync(): Promise<CoolifyInstanceInfo> {
    const [version, applications, services, projectsWithEnvs, servers] = await Promise.all([
      this.getVersionAsync(),
      this.listApplicationsAsync(),
      this.listServicesAsync(),
      this.listProjectsWithEnvironmentsAsync(),
      this.listServersAsync(),
    ]);

    const envToProjectMap = new Map<
      number,
      { projectName: string; projectUuid: string; environmentName: string; environmentUuid?: string }
    >();
    for (const project of projectsWithEnvs) {
      for (const env of project.environments ?? []) {
        if (env.id != null) {
          envToProjectMap.set(env.id, {
            projectName: project.name,
            projectUuid: project.uuid,
            environmentName: env.name,
            environmentUuid: env.uuid ?? undefined,
          });
        }
      }
    }

    const applicationsWithContext: CoolifyApplicationWithContext[] = applications.map((app) => {
      const context = app.environment_id ? envToProjectMap.get(app.environment_id) : undefined;
      return {
        ...app,
        projectName: context?.projectName,
        projectUuid: context?.projectUuid,
        environmentName: context?.environmentName,
        environmentUuid: context?.environmentUuid,
      };
    });

    const servicesWithContext: CoolifyServiceWithContext[] = services.map((service) => {
      const context = service.environment_id ? envToProjectMap.get(service.environment_id) : undefined;
      const fqdn = service.fqdn ?? service.applications?.find((app) => app.fqdn)?.fqdn ?? undefined;
      return {
        ...service,
        fqdn,
        projectName: context?.projectName,
        projectUuid: context?.projectUuid,
        environmentName: context?.environmentName,
        environmentUuid: context?.environmentUuid,
      };
    });

    return {
      version,
      applications: applicationsWithContext,
      services: servicesWithContext,
      servers,
    };
  }

  /**
   * List all projects with their environments
   */
  private async listProjectsWithEnvironmentsAsync(): Promise<CoolifyProjectWithEnvironments[]> {
    const projects = await this.listProjectsAsync();
    const projectsWithEnvs = await Promise.all(projects.map((project) => this.getProjectByUuidAsync(project.uuid)));
    return projectsWithEnvs;
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
    };
  }
}
