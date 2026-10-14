import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
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
} from "../../coolify/coolify-types";
import type { CoolifyInstanceInfo, CoolifyProjectWithEnvironments } from "../../coolify/coolify-types";
import { SpecialistProtocol, settleSpecialistTasksAsync } from "./protocol";
import type { SpecialistHttp } from "./protocol";

export class CoolifyProtocol extends SpecialistProtocol {
  private headers() {
    return { Authorization: `Bearer ${this.secret("apiKey")}` };
  }

  async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    return { headers: this.headers() };
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const http = this.testingHttp(input);
    await http.textAsync(this.url("/api/health"));
    await http.textAsync(this.url("/api/v1/version"), { headers: this.headers() });
    return { success: true };
  }

  getVersionAsync() {
    return this.runAsync(async (http) =>
      (await http.textAsync(this.url("/api/v1/version"), { headers: this.headers() })).trim(),
    );
  }
  getHealthcheckAsync() {
    return this.runAsync(async (http) =>
      coolifyHealthcheckSchema.parse(await this.getAsync(http, "/api/v1/healthcheck")),
    );
  }
  listApplicationsAsync() {
    return this.runAsync((http) => this.applicationsAsync(http));
  }
  getApplicationByUuidAsync(uuid: string) {
    return this.runAsync(async (http) =>
      coolifyApplicationSchema.parse(await this.getAsync(http, `/api/v1/applications/${uuid}`)),
    );
  }
  getApplicationLogsAsync(uuid: string) {
    return this.runAsync(
      async (http) =>
        coolifyApplicationLogSchema.parse(await this.getAsync(http, `/api/v1/applications/${uuid}/logs`)).logs,
    );
  }
  listEnvsByApplicationUuidAsync(uuid: string) {
    return this.runAsync(async (http) =>
      coolifyEnvironmentVariableSchema.array().parse(await this.getAsync(http, `/api/v1/applications/${uuid}/envs`)),
    );
  }
  listProjectsAsync() {
    return this.runAsync((http) => this.projectsAsync(http));
  }
  getProjectByUuidAsync(uuid: string) {
    return this.runAsync((http) => this.projectAsync(http, uuid));
  }
  getEnvironmentsAsync() {
    return this.runAsync(async (http) =>
      coolifyEnvironmentSchema.array().parse(await this.getAsync(http, "/api/v1/environments")),
    );
  }
  getEnvironmentByNameOrUuidAsync(nameOrUuid: string) {
    return this.runAsync(async (http) =>
      coolifyEnvironmentSchema.parse(await this.getAsync(http, `/api/v1/environments/${nameOrUuid}`)),
    );
  }
  listResourcesAsync() {
    return this.runAsync(async (http) =>
      coolifyResourceSchema.array().parse(await this.getAsync(http, "/api/v1/resources")),
    );
  }
  listServersAsync() {
    return this.runAsync((http) => this.serversAsync(http));
  }
  listServicesAsync() {
    return this.runAsync((http) => this.servicesAsync(http));
  }

  async getInstanceInfoAsync(): Promise<CoolifyInstanceInfo> {
    return this.runAsync(async (http) => {
      const [version, applications, services, projects, servers] = await settleSpecialistTasksAsync([
        http.textAsync(this.url("/api/v1/version"), { headers: this.headers() }).then((value) => value.trim()),
        this.applicationsAsync(http),
        this.servicesAsync(http),
        this.projectsWithEnvironmentsAsync(http),
        this.serversAsync(http),
      ] as const);
      const contexts = new Map<
        number,
        { projectName: string; projectUuid: string; environmentName: string; environmentUuid?: string }
      >();
      for (const project of projects) {
        for (const env of project.environments ?? []) {
          if (env.id != null)
            contexts.set(env.id, {
              projectName: project.name,
              projectUuid: project.uuid,
              environmentName: env.name,
              environmentUuid: env.uuid ?? undefined,
            });
        }
      }
      return {
        version,
        applications: applications.map((app) => ({
          ...app,
          ...this.contextFields(app.environment_id ? contexts.get(app.environment_id) : undefined),
        })),
        services: services.map((service) => ({
          ...service,
          fqdn: service.fqdn ?? service.applications?.find((app) => app.fqdn)?.fqdn ?? undefined,
          ...this.contextFields(service.environment_id ? contexts.get(service.environment_id) : undefined),
        })),
        servers,
      };
    });
  }

  private contextFields(context?: {
    projectName: string;
    projectUuid: string;
    environmentName: string;
    environmentUuid?: string;
  }) {
    return {
      projectName: context?.projectName,
      projectUuid: context?.projectUuid,
      environmentName: context?.environmentName,
      environmentUuid: context?.environmentUuid,
    };
  }

  private getAsync(http: SpecialistHttp, path: `/${string}`) {
    return http.jsonAsync(this.url(path), { headers: this.headers() });
  }
  private async applicationsAsync(http: SpecialistHttp) {
    return coolifyApplicationSchema.array().parse(await this.getAsync(http, "/api/v1/applications"));
  }
  private async servicesAsync(http: SpecialistHttp) {
    return coolifyServiceSchema.array().parse(await this.getAsync(http, "/api/v1/services"));
  }
  private async serversAsync(http: SpecialistHttp) {
    return coolifyServerSchema.array().parse(await this.getAsync(http, "/api/v1/servers"));
  }
  private async projectsAsync(http: SpecialistHttp) {
    return coolifyProjectSchema.array().parse(await this.getAsync(http, "/api/v1/projects"));
  }
  private async projectAsync(http: SpecialistHttp, uuid: string) {
    return coolifyProjectWithEnvironmentsSchema.parse(await this.getAsync(http, `/api/v1/projects/${uuid}`));
  }
  private async projectsWithEnvironmentsAsync(http: SpecialistHttp): Promise<CoolifyProjectWithEnvironments[]> {
    const projects = await this.projectsAsync(http);
    return settleSpecialistTasksAsync(projects.map((project) => this.projectAsync(http, project.uuid)));
  }
}
