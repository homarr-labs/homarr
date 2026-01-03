import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

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

const logger = createLogger({ module: "coolifyIntegration" });

@HandleIntegrationErrors([new CoolifyApiErrorHandler()])
export class CoolifyIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const healthUrl = this.url("/api/health");
    const healthResponse = await input.fetchAsync(healthUrl, {});

    if (!healthResponse.ok) {
      throw new Error(`Failed to connect to Coolify: ${healthResponse.statusText}`);
    }

    const versionUrl = this.url("/api/v1/version");
    const versionResponse = await input.fetchAsync(versionUrl, {
      headers: this.getAuthHeaders(),
    });

    if (!versionResponse.ok) {
      const errorText = await versionResponse.text();
      throw new Error(`Failed to authenticate with Coolify API: ${versionResponse.status} - ${errorText}`);
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
      throw new Error(`Failed to fetch Coolify version: ${response.statusText}`);
    }

    const version = await response.text();
    logger.info("Fetched Coolify version", { version });
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
      throw new Error(`Failed to fetch Coolify healthcheck: ${response.statusText}`);
    }

    const data = (await response.json()) as CoolifyHealthcheck;
    logger.info("Fetched Coolify healthcheck", { status: data.status });
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
      throw new Error(`Failed to fetch Coolify applications: ${response.statusText}`);
    }

    const data = (await response.json()) as CoolifyApplication[];
    logger.info("Fetched Coolify applications", { count: data.length });
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
      throw new Error(`Failed to fetch Coolify application ${uuid}: ${response.statusText}`);
    }

    const data = (await response.json()) as CoolifyApplication;
    logger.info("Fetched Coolify application", { uuid: data.uuid, name: data.name });
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
      throw new Error(`Failed to fetch Coolify application logs for ${uuid}: ${response.statusText}`);
    }

    const data = (await response.json()) as CoolifyApplicationLog;
    logger.info("Fetched Coolify application logs", { uuid });
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
      throw new Error(`Failed to fetch Coolify application environment variables for ${uuid}: ${response.statusText}`);
    }

    const data = (await response.json()) as CoolifyEnvironmentVariable[];
    logger.info("Fetched Coolify application environment variables", { uuid, count: data.length });
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
      throw new Error(`Failed to fetch Coolify projects: ${response.statusText}`);
    }

    const data = (await response.json()) as CoolifyProject[];
    logger.info("Fetched Coolify projects", { count: data.length });
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
      throw new Error(`Failed to fetch Coolify project ${uuid}: ${response.statusText}`);
    }

    const data = (await response.json()) as CoolifyProjectWithEnvironments;
    logger.info("Fetched Coolify project", { uuid: data.uuid, name: data.name });
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
      throw new Error(`Failed to fetch Coolify environments: ${response.statusText}`);
    }

    const data = (await response.json()) as CoolifyEnvironment[];
    logger.info("Fetched Coolify environments", { count: data.length });
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
      throw new Error(`Failed to fetch Coolify environment ${nameOrUuid}: ${response.statusText}`);
    }

    const data = (await response.json()) as CoolifyEnvironment;
    logger.info("Fetched Coolify environment", { name: data.name });
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
      throw new Error(`Failed to fetch Coolify resources: ${response.statusText}`);
    }

    const data = (await response.json()) as CoolifyResource[];
    logger.info("Fetched Coolify resources", { count: data.length });
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
      throw new Error(`Failed to fetch Coolify servers: ${response.statusText}`);
    }

    const data = (await response.json()) as CoolifyServer[];
    logger.info("Fetched Coolify servers", { count: data.length });
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
      throw new Error(`Failed to fetch Coolify services: ${response.statusText}`);
    }

    const data = (await response.json()) as CoolifyService[];
    logger.info("Fetched Coolify services", { count: data.length });
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

    const envToProjectMap = new Map<number, { projectName: string; projectUuid: string; environmentName: string }>();
    for (const project of projectsWithEnvs) {
      for (const env of project.environments) {
        envToProjectMap.set(env.id, {
          projectName: project.name,
          projectUuid: project.uuid,
          environmentName: env.name,
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
      };
    });

    const servicesWithContext: CoolifyServiceWithContext[] = services.map((service) => {
      const context = service.environment_id ? envToProjectMap.get(service.environment_id) : undefined;
      return {
        ...service,
        projectName: context?.projectName,
        projectUuid: context?.projectUuid,
        environmentName: context?.environmentName,
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
