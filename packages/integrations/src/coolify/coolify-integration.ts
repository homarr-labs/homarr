import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { HandleIntegrationErrors } from "../base/errors/decorator";
import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import { CoolifyApiErrorHandler } from "./coolify-error-handler";
import type {
  CoolifyApplication,
  CoolifyApplicationLog,
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

@HandleIntegrationErrors([new CoolifyApiErrorHandler()])
export class CoolifyIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const healthUrl = this.url("/api/health");
    const healthResponse = await input.fetchAsync(healthUrl, {});

    if (!healthResponse.ok) {
      throw new ResponseError(healthResponse);
    }

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
  public async getVersionAsync(fetchAsync = fetchWithTrustedCertificatesAsync): Promise<string> {
    const url = this.url("/api/v1/version");
    const response = await fetchAsync(url, {
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
  public async getHealthcheckAsync(fetchAsync = fetchWithTrustedCertificatesAsync): Promise<CoolifyHealthcheck> {
    const url = this.url("/api/v1/healthcheck");
    const response = await fetchAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = (await response.json()) as CoolifyHealthcheck;
    return data;
  }

  /**
   * List all applications
   * https://coolify.io/docs/api-reference/api/operations/list-applications
   */
  public async listApplicationsAsync(fetchAsync = fetchWithTrustedCertificatesAsync): Promise<CoolifyApplication[]> {
    const url = this.url("/api/v1/applications");
    const response = await fetchAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = (await response.json()) as CoolifyApplication[];
    return data;
  }

  /**
   * Get application by UUID
   * https://coolify.io/docs/api-reference/api/operations/get-application-by-uuid
   */
  public async getApplicationByUuidAsync(
    uuid: string,
    fetchAsync = fetchWithTrustedCertificatesAsync,
  ): Promise<CoolifyApplication> {
    const url = this.url(`/api/v1/applications/${uuid}`);
    const response = await fetchAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = (await response.json()) as CoolifyApplication;
    return data;
  }

  /**
   * Get application logs by UUID
   * https://coolify.io/docs/api-reference/api/operations/get-application-logs-by-uuid
   */
  public async getApplicationLogsAsync(uuid: string, fetchAsync = fetchWithTrustedCertificatesAsync): Promise<string> {
    const url = this.url(`/api/v1/applications/${uuid}/logs`);
    const response = await fetchAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = (await response.json()) as CoolifyApplicationLog;
    return data.logs;
  }

  /**
   * List environment variables by application UUID
   * https://coolify.io/docs/api-reference/api/operations/list-envs-by-application-uuid
   */
  public async listEnvsByApplicationUuidAsync(
    uuid: string,
    fetchAsync = fetchWithTrustedCertificatesAsync,
  ): Promise<CoolifyEnvironmentVariable[]> {
    const url = this.url(`/api/v1/applications/${uuid}/envs`);
    const response = await fetchAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = (await response.json()) as CoolifyEnvironmentVariable[];
    return data;
  }

  /**
   * List projects
   * https://coolify.io/docs/api-reference/api/operations/list-projects
   */
  public async listProjectsAsync(fetchAsync = fetchWithTrustedCertificatesAsync): Promise<CoolifyProject[]> {
    const url = this.url("/api/v1/projects");
    const response = await fetchAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = (await response.json()) as CoolifyProject[];
    return data;
  }

  /**
   * Get project by UUID (includes environments)
   * https://coolify.io/docs/api-reference/api/operations/get-project-by-uuid
   */
  public async getProjectByUuidAsync(
    uuid: string,
    fetchAsync = fetchWithTrustedCertificatesAsync,
  ): Promise<CoolifyProjectWithEnvironments> {
    const url = this.url(`/api/v1/projects/${uuid}`);
    const response = await fetchAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = (await response.json()) as CoolifyProjectWithEnvironments;
    return data;
  }

  /**
   * List all projects with their environments
   */
  public async listProjectsWithEnvironmentsAsync(
    fetchAsync = fetchWithTrustedCertificatesAsync,
  ): Promise<CoolifyProjectWithEnvironments[]> {
    const projects = await this.listProjectsAsync(fetchAsync);
    const projectsWithEnvs = await Promise.all(
      projects.map((project) => this.getProjectByUuidAsync(project.uuid, fetchAsync)),
    );
    return projectsWithEnvs;
  }

  /**
   * Get environments
   * https://coolify.io/docs/api-reference/api/operations/get-environments
   */
  public async getEnvironmentsAsync(fetchAsync = fetchWithTrustedCertificatesAsync): Promise<CoolifyEnvironment[]> {
    const url = this.url("/api/v1/environments");
    const response = await fetchAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = (await response.json()) as CoolifyEnvironment[];
    return data;
  }

  /**
   * Get environment by name or UUID
   * https://coolify.io/docs/api-reference/api/operations/get-environment-by-name-or-uuid
   */
  public async getEnvironmentByNameOrUuidAsync(
    nameOrUuid: string,
    fetchAsync = fetchWithTrustedCertificatesAsync,
  ): Promise<CoolifyEnvironment> {
    const url = this.url(`/api/v1/environments/${nameOrUuid}`);
    const response = await fetchAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = (await response.json()) as CoolifyEnvironment;
    return data;
  }

  /**
   * List resources
   * https://coolify.io/docs/api-reference/api/operations/list-resources
   */
  public async listResourcesAsync(fetchAsync = fetchWithTrustedCertificatesAsync): Promise<CoolifyResource[]> {
    const url = this.url("/api/v1/resources");
    const response = await fetchAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = (await response.json()) as CoolifyResource[];
    return data;
  }

  /**
   * List servers
   * https://coolify.io/docs/api-reference/api/operations/list-servers
   */
  public async listServersAsync(fetchAsync = fetchWithTrustedCertificatesAsync): Promise<CoolifyServer[]> {
    const url = this.url("/api/v1/servers");
    const response = await fetchAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = (await response.json()) as CoolifyServer[];
    return data;
  }

  /**
   * List services
   * https://coolify.io/docs/api-reference/api/operations/list-services
   */
  public async listServicesAsync(fetchAsync = fetchWithTrustedCertificatesAsync): Promise<CoolifyService[]> {
    const url = this.url("/api/v1/services");
    const response = await fetchAsync(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    const data = (await response.json()) as CoolifyService[];
    return data;
  }

  public async getInstanceInfoAsync(fetchAsync = fetchWithTrustedCertificatesAsync): Promise<CoolifyInstanceInfo> {
    const [version, applications, services, projectsWithEnvs, servers] = await Promise.all([
      this.getVersionAsync(fetchAsync),
      this.listApplicationsAsync(fetchAsync),
      this.listServicesAsync(fetchAsync),
      this.listProjectsWithEnvironmentsAsync(fetchAsync),
      this.listServersAsync(fetchAsync),
    ]);

    const envToProjectMap = new Map<
      number,
      { projectName: string; projectUuid: string; environmentName: string; environmentUuid?: string }
    >();
    for (const project of projectsWithEnvs) {
      for (const env of project.environments) {
        envToProjectMap.set(env.id, {
          projectName: project.name,
          projectUuid: project.uuid,
          environmentName: env.name,
          environmentUuid: env.uuid,
        });
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

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
    };
  }
}
