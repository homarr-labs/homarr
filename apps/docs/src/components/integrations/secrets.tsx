import { IconCode, IconKey, IconKeyOff, IconLink, IconPassword, IconPlug, IconUser } from "@tabler/icons-react";
import { ReactNode } from "react";
import Alert from "@/components/mdx/admonition";
import Tabs, { TabItem } from "@/components/mdx/legacy-tabs";

export const secretKinds = {
  apiKey: {
    name: "API Key",
    description: "API Key from the service for authentication.",
    icon: IconKey,
  },
  username: {
    name: "Username",
    description: "Account username for authentication.",
    icon: IconUser,
  },
  password: {
    name: "Password",
    description: "Account password for authentication.",
    icon: IconPassword,
  },
  tokenId: {
    name: "Token ID",
    description: "Token ID used for authentication",
  },
  realm: {
    name: "Realm",
    description: "The realm used for authentication, most of the time this is pve",
  },
  topic: {
    name: "Topic",
    description: "The topic to from which notifications should be retrieved.",
  },
  personalAccessToken: {
    name: "Personal Access Token",
    description: "A personal access token for authentication.",
    icon: IconKey,
  },
  opnsenseApiKey: {
    name: "Api Key (Key)",
    description: "The Key part of the API Key for authentication.",
    icon: IconKey,
  },
  opnsenseApiSecret: {
    name: "Api Key (Secret)",
    description: "The Secret part of the API Key for authentication.",
    icon: IconPassword,
  },
  patchmonApiKey: {
    name: "API Key",
    description: "The API key from PatchMon's GetHomepage integration.",
    icon: IconKey,
  },
  patchmonApiSecret: {
    name: "API Secret",
    description: "The API secret from PatchMon's GetHomepage integration.",
    icon: IconPassword,
  },
  githubAppId: { name: "App ID", description: "The ID of the GitHub App", icon: IconCode },
  githubInstallationId: {
    name: "Installation ID",
    description: "The ID of the GitHub Installation",
    icon: IconPlug,
  },
  privateKey: {
    name: "Private Key",
    description: "The private key for authentication",
    icon: IconKey,
  },
  url: {
    name: "Url",
    description: "The url of the service",
    icon: IconLink,
  },
  slug: {
    name: "Slug",
    description: "The slug or path identifier for the resource",
    icon: IconLink,
  },
  wazuhIndexerUrl: {
    name: "Indexer URL",
    description: "URL of the Wazuh indexer (OpenSearch), usually https://wazuh:9200",
    icon: IconLink,
  },
  wazuhIndexerUsername: {
    name: "Indexer username",
    description: "Wazuh indexer user with read access to wazuh-alerts-*, wazuh-monitoring-* and wazuh-states-*",
    icon: IconUser,
  },
  wazuhIndexerPassword: {
    name: "Indexer password",
    description: "Password of the Wazuh indexer user",
    icon: IconPassword,
  },
  wazuhDashboardUrl: {
    name: "Dashboard URL",
    description: "Optional. Public URL of the Wazuh dashboard, used for deep links from the widgets",
    icon: IconLink,
  },
};

type SecretKind = keyof typeof secretKinds;

interface IntegrationSecretsProps {
  secrets: {
    tabLabel?: string;
    credentials: SecretKind[];
    steps: ReactNode[];
    header?: ReactNode;
    body?: ReactNode;
    footer?: ReactNode;
  }[];
}

export const IntegrationSecrets = ({ secrets }: IntegrationSecretsProps) => {
  return (
    <div className="flex flex-col gap-4 mt-6 w-full">
      <div className="w-full">
        <Tabs className="w-full rounded-none border-0 bg-transparent [&>[role=tablist]]:px-0">
          {secrets.map((secret, index) => {
            const key = secret.credentials.join("-") || `no-authentication-${index}`;
            const Icon =
              secret.credentials.map((value) => secretKinds[value]).find((value) => "icon" in value)?.icon ||
              IconKeyOff;
            const tabLabel =
              secret.tabLabel ??
              (secret.credentials.length === 0
                ? "No Authentication"
                : secret.credentials.map((value) => secretKinds[value].name).join(" & "));

            return (
              <TabItem
                key={key}
                label={
                  <div className="flex gap-2 items-center">
                    <Icon size={20} stroke={1.5} />
                    <span>{tabLabel}</span>
                  </div>
                }
                className="w-full rounded-none bg-transparent px-0"
                value={key}
              >
                <div className="w-full gap-4 flex flex-col">
                  {secret.header}
                  {secret.credentials.length >= 1 && (
                    <table className="mb-0 w-full">
                      <thead>
                        <tr>
                          <th className="text-start min-w-32">Name</th>
                          <th className="text-start w-full">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {secret.credentials.map((credential) => {
                          const kind = secretKinds[credential];
                          return (
                            <tr key={credential}>
                              <td>
                                <div>{kind.name}</div>
                              </td>
                              <td>{kind.description}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  {secret.credentials.length === 0 && (
                    <Alert type="info" title="No credentials required">
                      This integration does not require any credentials to be set.
                    </Alert>
                  )}
                  {secret.body}

                  {secret.steps.length >= 1 && (
                    <>
                      <h3>Steps to retrieve the credentials:</h3>

                      <ol>
                        {secret.steps.map((step, index) => (
                          <li key={index} className="mb-2">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </>
                  )}

                  {secret.footer}
                </div>
              </TabItem>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
};
