import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import { CoolifyApiErrorHandler } from "./coolify-error-handler";
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

@HandleIntegrationErrors([new CoolifyApiErrorHandler()])
export class CoolifyIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const healthUrl = this.url("/api/health");
    const healthResponse = await input.fetchAsync(healthUrl, {});

    if (!healthResponse.ok) {
      throw new ResponseError(healthResponse);
    }

    // Reuse getVersionAsync to test API key authentication
    await this.getVersionAsync();

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

    const result = coolifyHealthcheckSchema.safeParse(await response.json());
    if (!result.success) {
      throw new ResponseError(response, {
        cause: new Error(`Failed to parse healthcheck response: ${result.error.message}`),
      });
    }

    return result.data;
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

    const result = coolifyApplicationSchema.array().safeParse(await response.json());
    if (!result.success) {
      throw new ResponseError(response, {
        cause: new Error(`Failed to parse applications response: ${result.error.message}`),
      });
    }

    return result.data;
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

    const result = coolifyApplicationSchema.safeParse(await response.json());
    if (!result.success) {
      throw new ResponseError(response, {
        cause: new Error(`Failed to parse application response: ${result.error.message}`),
      });
    }

    return result.data;
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

    const result = coolifyApplicationLogSchema.safeParse(await response.json());
    if (!result.success) {
      throw new ResponseError(response, {
        cause: new Error(`Failed to parse application logs response: ${result.error.message}`),
      });
    }

    return result.data.logs;
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

    const result = coolifyEnvironmentVariableSchema.array().safeParse(await response.json());
    if (!result.success) {
      throw new ResponseError(response, {
        cause: new Error(`Failed to parse environment variables response: ${result.error.message}`),
      });
    }

    return result.data;
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

    const result = coolifyProjectSchema.array().safeParse(await response.json());
    if (!result.success) {
      throw new ResponseError(response, {
        cause: new Error(`Failed to parse projects response: ${result.error.message}`),
      });
    }

    return result.data;
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

    const result = coolifyProjectWithEnvironmentsSchema.safeParse(await response.json());
    if (!result.success) {
      throw new ResponseError(response, {
        cause: new Error(`Failed to parse project response: ${result.error.message}`),
      });
    }

    return result.data;
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

    const result = coolifyEnvironmentSchema.array().safeParse(await response.json());
    if (!result.success) {
      throw new ResponseError(response, {
        cause: new Error(`Failed to parse environments response: ${result.error.message}`),
      });
    }

    return result.data;
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

    const result = coolifyEnvironmentSchema.safeParse(await response.json());
    if (!result.success) {
      throw new ResponseError(response, {
        cause: new Error(`Failed to parse environment response: ${result.error.message}`),
      });
    }

    return result.data;
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

    const result = coolifyResourceSchema.array().safeParse(await response.json());
    if (!result.success) {
      throw new ResponseError(response, {
        cause: new Error(`Failed to parse resources response: ${result.error.message}`),
      });
    }

    return result.data;
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

    const result = coolifyServerSchema.array().safeParse(await response.json());
    if (!result.success) {
      throw new ResponseError(response, {
        cause: new Error(`Failed to parse servers response: ${result.error.message}`),
      });
    }

    return result.data;
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

    const result = coolifyServiceSchema.array().safeParse(await response.json());
    if (!result.success) {
      throw new ResponseError(response, {
        cause: new Error(`Failed to parse services response: ${result.error.message}`),
      });
    }

    return result.data;
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
