# Helm

<img src="https://raw.githubusercontent.com/homarr-labs/charts/refs/heads/main/charts/homarr/icon.svg" align="right" width="92" alt="homarr logo">

![Version: 8.7.0](https://img.shields.io/badge/Version-8.7.0-informational?style=flat)
![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat)
![AppVersion: v1.48.0](https://img.shields.io/badge/AppVersion-v1.48.0-informational?style=flat)

A Helm chart to deploy homarr for Kubernetes

**Homepage:** <https://homarr-labs.github.io/charts/charts/homarr/>

## Source Code

* <https://github.com/homarr-labs/homarr>

## Requirements

Kubernetes: `>=1.24.0-0`

## Dependencies

This chart has no dependencies.

## Installing the Chart

To install the chart with the release name `homarr`

### OCI (Recommended)

```console
helm install homarr oci://ghcr.io/homarr-labs/charts/homarr
```

### Traditional

```console
helm repo add homarr-labs https://homarr-labs.github.io/charts/
helm repo update
helm install homarr homarr-labs/homarr
```

## Uninstalling the Chart

To uninstall the `homarr` deployment

```console
helm uninstall homarr
```

The command removes all the Kubernetes components associated with the chart **including persistent volumes** and deletes the release.

## Configuration

Read through the [values.yaml](https://github.com/homarr-labs/charts/blob/dev/charts/homarr/values.yaml) file. It has several commented out suggested values.

Specify each parameter using the `--set key=value[,key=value]` argument to `helm install`.

```console
helm install homarr \
  --set env.TZ="America/New York" \
    homarr-labs/homarr
```

Alternatively, a YAML file that specifies the values for the above parameters can be provided while installing the chart.

```console
helm install homarr homarr-labs/homarr -f values.yaml
```

## Custom configuration

### Secrets

To avoid including sensitive information in plain text within your version control, consider using a declarative approach by applying secrets directly with kubectl apply. For example, instead of including repository credentials in your Helm values, you can leverage a kubernetes secrets manager.

Below is an exhaustive list of all secrets:

| FEATURE   | SECRET NAME             | SECRET KEYS                             | Required |
|-----------|-------------------------|-----------------------------------------|----------|
| OIDC      | auth-oidc-secret        | oidc-client-id<br>oidc-client-secret    | No       |
| LDAP      | auth-ldap-secret        | bind-password                           | No       |
| DATABASE  | db-secret               | db-url                                  | No       |
| DATABASE  | db-encryption           | db-encryption-key                       | yes      |

### Database

You have multiple options for configuring the database:

| DRIVER TYPE    | Persistence mode                |
|----------------|---------------------------------|
| better-sqlite3 | Pod disk                        |
| better-sqlite3 | homarr-database PVC             |
| mysql2         | External MySql database         |
| node-postgres  | External Postgresql database    |

#### Pod disk

No additional configuration is required. However, keep in mind that if the pod restarts, all data will be lost. This setup is not *recommended* for production use.

To create the necessary database secret, execute the following command:

<details>
<summary>Required Secrets</summary>

````yaml
kubectl create secret generic db-encryption \
--from-literal=db-encryption-key='<SECRET_ENCRYPTION_KEY_SECRET_TO_CHANGE>' \
--namespace homarr
````

</details>

#### PVC

To persist data, you need to enable the `homarr-database` PVC. This will store the Homarr database on a mounted volume.

Associated secret to create :

<details>
<summary>DB Required Secrets</summary>

````yaml
kubectl create secret generic db-encryption \
--from-literal=db-encryption-key='<SECRET_ENCRYPTION_KEY_SECRET_TO_CHANGE>' \
--namespace homarr
````

</details>

Bellow an example of the override value file :

<details>
<summary>values.yaml</summary>

````yaml
persistence:
  homarrDatabase:
    enabled: true
    storageClassName: "default"
    size: "1Gi"
````

</details>

#### External MySql database

To create the necessary database secrets, execute the following command:

<details>
<summary>Required Secrets</summary>

````yaml
kubectl create secret generic db-encryption \
--from-literal=db-encryption-key='<SECRET_ENCRYPTION_KEY_SECRET_TO_CHANGE>' \
--namespace homarr
````

````yaml
kubectl create secret generic db-secret \
--from-literal=db-url='mysql://user:password@host:port/homarrdb' \
--namespace homarr
````
</details>

Below is an example of the override values file:

<details>
<summary>values.yaml</summary>

````yaml
database:
  type: mysql
````
</details>

#### External Postgresql database

To create the necessary database secrets, execute the following command:

<details>
<summary>Required Secrets</summary>

````yaml
kubectl create secret generic db-encryption \
--from-literal=db-encryption-key='<SECRET_ENCRYPTION_KEY_SECRET_TO_CHANGE>' \
--namespace homarr
````

````yaml
kubectl create secret generic db-secret \
--from-literal=db-url='postgresql://user:password@host:port/homarrdb' \
--namespace homarr
````

</details>

Below is an example of the override values file:

<details>
<summary>values.yaml</summary>

````yaml
database:
  type: postgresql
````
</details>

### Ingress

The ingress section in the values.yaml file allows you to configure how external traffic accesses your application through an Ingress resource. This section defines whether Ingress is enabled, the class to use, and how to set up hosts, paths, and TLS for secure connections.

<details>
<summary>values.yaml</summary>

````yaml
service:
  enabled: true # Ensure the service is enabled for Ingress to route traffic
ingress:
  enabled: true
  ingressClassName: "traefik"
  annotations:
  # Add any additional annotations as needed
  hosts:
    - host: homarr.homelab.dev
      paths:
        - path: /
          pathType: ImplementationSpecific
  tls:
    - hosts:
        - "homarr.homelab.dev"
        - "www.homarr.homelab.dev"
      secretName: homelab-tls
````
</details>

### HTTPRoute (Gateway API)

The httproute section in the values.yaml file allows you to configure how external traffic accesses your application using the Kubernetes Gateway API.
This provides a more expressive and future-proof alternative to Ingress, with support for advanced routing, filters, and multiple parent Gateways.

<details>
<summary>values.yaml</summary>

````yaml
service:
  enabled: true  # must be enabled for HTTPRoute to forward traffic
httproute:
  enabled: true
  parentRefs:
    - name: my-gateway
      namespace: default
  hostnames:
    - homarr.homelab.dev
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: homarr
          port: 8080
````
</details>

#### Notes:

- parentRefs: the Gateway(s) this route attaches to. Gateways must already exist.
- hostnames: domain names this route applies to.
- rules:  each rule can define matches (paths, headers, queries), optional filters, and backendRefs to services
- TLS must be configured on the Gateway (not on HTTPRoute). For example, the Gateway can have a TLS listener for homarr.homelab.dev, and this route will automatically apply once matched.

### Certificates

Configuration for trusted certificate persistence. Supports:

- Declarative config via `configmap` or `secret`
- Pre-existing secret with `existingSecret`

#### type: configmap

Use inline certificates to generate a ConfigMap, mounted as individual files.

<details>
<summary>values.yaml</summary>

````yaml
persistence:
  homarrTrustedCerts:
    enabled: true
    type: configmap
    certificates:
      cert1.crt: |
        -----BEGIN CERTIFICATE-----
        MIID...ABCD==
        -----END CERTIFICATE-----
      cert2.crt: |
        -----BEGIN CERTIFICATE-----
        MIID...EFGH==
        -----END CERTIFICATE-----
````
</details>

Behavior:

- Helm creates a ConfigMap with keys cert1.crt and cert2.crt
- Mounts them as /appdata/trusted-certificates/cert1.crt and /appdata/trusted-certificates/cert2.crt

#### type: secret

Use inline certificates to generate a Kubernetes Secret, mounted as files.

<details>
<summary>values.yaml</summary>

````yaml
persistence:
  homarrTrustedCerts:
    enabled: true
    type: secret
    certificates:
      cert1.crt: |
        -----BEGIN CERTIFICATE-----
        MIIC...XYZ==
        -----END CERTIFICATE-----
      cart2.crt: |
        -----BEGIN CERTIFICATE-----
        MIIC...XYZ==
        -----END CERTIFICATE-----
````
</details>

Behavior:

- Helm creates a Kubernetes Secret with cert1.crt and cart2.crt keys
- Mounts it into the container

#### type: existingSecret

Use an existing Kubernetes Secret, assuming its keys are filenames.

<details>
<summary>values.yaml</summary>

````yaml
persistence:
  homarrTrustedCerts:
    enabled: true
    type: existingSecret
    existingSecretName: "existingSecretName"
    existingSecretKeys:
        - cert3.crt
        - cert4.crt
````
</details>

Behavior:

- No new Secret is created
- Uses existingSecretName directly
- Mounts all keys as files in /appdata/trusted-certificates

#### Summary Table

| Type             | Creates Resource | Requires Certificates | Uses Existing | Mounts As Files |
| ---------------- | ---------------- | --------------------- | ------------- | --------------- |
| `configmap`      | ConfigMap        | Yes (`certificates`)  | ❌            | ✅              |
| `secret`         | Secret           | Yes (`certificates`)  | ❌            | ✅              |
| `existingSecret` | ❌               | ❌                    | ✅            | ✅              |

All available values are listed on the [artifacthub](https://artifacthub.io/packages/helm/homarr-labs/homarr?modal=values). If you find any issue please open an issue on [github](https://github.com/homarr-labs/charts/issues/new?assignees=maintainers&labels=bug&projects=&template=bug_report.yaml)

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| additionalObjects | list | `[]` | Additional resources to deploy. These objects are templated. |
| affinity | object | `{}` | Node affinity for pod scheduling |
| autoscaling.enabled | bool | `false` | Enable autoscaling |
| autoscaling.maxReplicas | int | `100` | Maximum replicas |
| autoscaling.minReplicas | int | `1` | Minimum replicas |
| autoscaling.targetCPUUtilizationPercentage | int | `80` | Target CPU utilization for autoscaling |
| containerPorts | object | `{"http":{"port":7575,"protocol":"TCP"}}` | containerPorts defines the ports to open on the container. It is a map where each entry specifies:    - `port`     (int)    (required): The port number to expose inside the container.    - `protocol` (string) (required): The network protocol (TCP or UDP) used for the port.    - `disabled` (bool)              : Optional flag to disable this port (defaults to false). Can be overridden via Helm values.  By default, this configuration exposes TCP port 7575 with the name `http`. |
| database.migrationEnabled | bool | `true` | Database migration configuration. DB_MIGRATIONS_DISABLED Set to `true` to disable database migrations. Migrations are enabled by default (`false`). |
| database.type | string | `"sqlite"` | Database type: sqlite, mysql or postgresql |
| env.AUTH_LDAP_BASE | string | `nil` | Base dn of your LDAP server |
| env.AUTH_LDAP_BIND_DN | string | `nil` | User used for finding users and groups |
| env.AUTH_LDAP_GROUP_CLASS | string | `"groupOfUniqueNames"` | Class used for querying groups |
| env.AUTH_LDAP_GROUP_FILTER_EXTRA_ARG | string | `nil` | Extra arguments for user's groups search filter (& based) |
| env.AUTH_LDAP_GROUP_MEMBER_ATTRIBUTE | string | `"member"` | Attribute used for querying group member |
| env.AUTH_LDAP_GROUP_MEMBER_USER_ATTRIBUTE | string | `"dn"` | User attribute used for comparing with group member |
| env.AUTH_LDAP_SEARCH_SCOPE | string | `"base"` | LDAP search scope between base, one or sub |
| env.AUTH_LDAP_URI | string | `nil` | URI of your LDAP server |
| env.AUTH_LDAP_USERNAME_ATTRIBUTE | string | `"uid"` | Attribute used for username |
| env.AUTH_LDAP_USERNAME_FILTER_EXTRA_ARG | string | `nil` | Extra arguments for user search filter (& based) |
| env.AUTH_LDAP_USER_MAIL_ATTRIBUTE | string | `"mail"` | Attribute used for mail field |
| env.AUTH_LOGOUT_REDIRECT_URL | string | `nil` | URL to redirect to after clicking logging out. |
| env.AUTH_OIDC_AUTO_LOGIN | string | `"false"` | Automatically redirect to OIDC login |
| env.AUTH_OIDC_CLIENT_NAME | string | `"OIDC"` | Display name of provider (in login screen) |
| env.AUTH_OIDC_GROUPS_ATTRIBUTE | string | `"groups"` | Attribute used for groups (roles) claim |
| env.AUTH_OIDC_ISSUER | string | `nil` | Issuer URI of OIDC provider without trailing slash (/) |
| env.AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE | string | `nil` | Overwrite name attribute. By default, it will use preferred_username if it does not contain a @ and otherwise name. |
| env.AUTH_OIDC_SCOPE_OVERWRITE | string | `"openid email profile groups"` | Override the OIDC scopes |
| env.AUTH_PROVIDERS | string | `"credentials"` | Enabled authentication methods. Multiple providers can be enabled with by separating them with , (ex. AUTH_PROVIDERS=credentials,oidc, it is highly recommended to just enable one provider). |
| env.AUTH_SESSION_EXPIRY_TIME | string | `"30d"` | Time for the session to time out. Can be set as pure number, which will automatically be used in seconds, or followed by s, m, h or d for seconds, minutes, hours or days. (ex: "30m") |
| env.ENABLE_DNS_CACHING | string | `"false"` | Enables dns caching. This is not yet working for all users. See #4006 |
| env.LOG_LEVEL | string | `"info"` | Log level to use. Possible values: debug/info/warn/error |
| env.NO_EXTERNAL_CONNECTION | string | `"false"` | Disables some requests that need internet connection |
| env.TZ | string | `"Europe/Paris"` | Your local time zone |
| envSecrets.authLdapCredentials.existingSecret | string | `"auth-ldap-secret"` | Name of existing secret containing LDAP credentials |
| envSecrets.authLdapCredentials.ldapBindingPassword | string | `"bind-password"` | Password for bind user secret key |
| envSecrets.authOidcCredentials.existingSecret | string | `"auth-oidc-secret"` | Name of existing secret containing OIDC credentials |
| envSecrets.authOidcCredentials.oidcClientId | string | `"oidc-client-id"` | ID of OIDC client (application) secret key |
| envSecrets.authOidcCredentials.oidcClientSecret | string | `"oidc-client-secret"` | Secret of OIDC client (application) secret key |
| envSecrets.dbCredentials.dbUrlKey | string | `"db-url"` | Secret key for DB_URL Example for external database: `mysql://username:password@host:port/homarrdb` or `postgresql://username:password@host:port/homarrdb` |
| envSecrets.dbCredentials.existingSecret | string | `"db-secret"` | Name of existing secret containing DB credentials |
| envSecrets.dbEncryption.existingSecret | string | `"db-encryption"` | Name of existing secret containing DB encryption |
| envSecrets.dbEncryption.key | string | `"db-encryption-key"` | Secret key for SECRET_ENCRYPTION_KEY can be generated with `openssl rand -hex 32` |
| fullnameOverride | string | `""` | Overrides chart's fullname |
| hostAliases | list | `[]` | Add static entries to /etc/hosts in the Pod. This is useful in the following cases: - You are running in a dual-stack cluster (IPv4 + IPv6) and want to force usage of IPv4 for specific hostnames - Your application is having DNS resolution issues or IPv6 preference issues - You need to override or simulate DNS entries without changing global DNS - You are running in an air-gapped or isolated environment without external DNS Example: hostAliases:   - ip: "192.168.1.10"     hostnames:       - "example.com"       - "example.internal" |
| httproute | object | `{"enabled":false,"hostnames":["chart-example.local"],"parentRefs":[{"name":"my-gateway","namespace":"default"}],"rules":[{"backendRefs":[{"name":"homarr","port":8080}],"filters":[],"matches":[{"path":{"type":"PathPrefix","value":"/"}}]}]}` | Gateway API HTTPRoute configuration |
| httproute.enabled | bool | `false` | Enable HTTPRoute |
| httproute.hostnames | list | `["chart-example.local"]` | Hostnames this route matches (similar to ingress.hosts.host) |
| httproute.parentRefs | list | `[{"name":"my-gateway","namespace":"default"}]` | References to the parent Gateway(s) this route attaches to. Each item must include at least a `name`, and optionally a `namespace`. |
| httproute.rules | list | `[{"backendRefs":[{"name":"homarr","port":8080}],"filters":[],"matches":[{"path":{"type":"PathPrefix","value":"/"}}]}]` | List of routing rules. Each rule can include: - matches: path/header/query matching - filters: optional transformations (redirects, header modifications, etc.) - backendRefs: one or more Kubernetes Services to forward traffic to |
| httproute.rules[0].filters | list | `[]` | Optional filters for this rule (default: empty) |
| httproute.rules[0].matches[0].path.type | string | `"PathPrefix"` | Path match type. One of: Exact, PathPrefix, RegularExpression |
| httproute.rules[0].matches[0].path.value | string | `"/"` | Path value to match |
| image.pullPolicy | string | `"IfNotPresent"` | Image pull policy |
| image.repository | string | `"ghcr.io/homarr-labs/homarr"` | Image repository |
| image.tag | string | `"v1.48.0"` | Overrides the image tag whose default is the chart appVersion |
| imagePullSecrets | list | `[]` | Secrets for Docker registry |
| ingress.annotations | object | `{}` | Ingress annotations |
| ingress.enabled | bool | `false` | Enable ingress |
| ingress.hosts | list | `[{"host":"chart-example.local","paths":[{"path":"/"}]}]` | Ingress hosts configuration |
| ingress.ingressClassName | string | `""` | Ingress class name |
| ingress.tls | list | `[]` | Ingress TLS configuration |
| livenessProbe.failureThreshold | int | `3` | Failure threshold for liveness probe - number of consecutive failures before pod is restarted |
| livenessProbe.httpGet.path | string | `"/api/health/live"` | This is the liveness check endpoint used by Kubernetes to determine if the application is still running. |
| livenessProbe.httpGet.port | int | `7575` | The port on which the liveness check will be performed. This must be the same as the container port exposed by the application. |
| livenessProbe.initialDelaySeconds | int | `10` | Initial delay in seconds before the liveness probe starts |
| livenessProbe.periodSeconds | int | `10` | Period in seconds between liveness probe checks |
| livenessProbe.timeoutSeconds | int | `1` | Timeout in seconds for each liveness probe check |
| nameOverride | string | `""` | Overrides chart's name |
| nodeSelector | object | `{}` | Node selectors for pod scheduling |
| persistence.homarrDatabase.accessMode | string | `"ReadWriteOnce"` | homarr-database access mode |
| persistence.homarrDatabase.enabled | bool | `false` | Enable homarr-database persistent storage |
| persistence.homarrDatabase.mountPath | string | `"/appdata"` | homarr-database mount path inside the pod |
| persistence.homarrDatabase.name | string | `"homarr-database"` | homarr-database persistent storage name |
| persistence.homarrDatabase.size | string | `"50Mi"` | homarr-database storage size |
| persistence.homarrDatabase.storageClassName | string | `"local-path"` | homarr-database storage class name |
| persistence.homarrDatabase.volumeClaimName | string | `""` | homarr-database optional volumeClaimName to target specific PV |
| persistence.homarrTrustedCerts.certificates | string | `nil` | homarr-trusted-certificates certificates, each entry will become a new trusted certificate as a dedicated file (works only for "configmap" and "secret" mode) |
| persistence.homarrTrustedCerts.enabled | bool | `false` | Enable trusted certificates persistence |
| persistence.homarrTrustedCerts.existingSecretKeys | string | `nil` | List of keys (filenames) to mount from the existing secret (used only when type is "existingSecret") |
| persistence.homarrTrustedCerts.existingSecretName | string | `""` | Name of the existing Kubernetes Secret to mount (required if type is "existingSecret") |
| persistence.homarrTrustedCerts.mountPath | string | `"/appdata/trusted-certificates"` | homarr-trusted-certificates  mount path inside the pod |
| persistence.homarrTrustedCerts.type | string | `"configmap"` | Persistence mode can be : configmap (declarative), secret (declarative) or existingSecret (mount an existing Kubernetes Secret by name and specify which keys to mount as files) |
| podAnnotations | object | `{}` | Pod annotations |
| podLabels | object | `{}` | Pod labels |
| podSecurityContext | object | `{}` | Pod security context |
| rbac | object | `{"enabled":false}` | Enable RBAC resources for Kubernetes integration Creates Role, ClusterRole, and associated bindings for Homarr's Kubernetes features |
| rbac.enabled | bool | `false` | Enable to create RBAC resources and activate Kubernetes integration |
| readinessProbe.failureThreshold | int | `3` | Failure threshold for readiness probe - number of consecutive failures before pod is considered unready |
| readinessProbe.httpGet.path | string | `"/api/health/ready"` | This is the readiness check endpoint used by Kubernetes to determine if the application is ready to handle traffic. |
| readinessProbe.httpGet.port | int | `7575` | The port on which the readiness check will be performed. This must match the container's exposed port. |
| readinessProbe.initialDelaySeconds | int | `10` | Initial delay in seconds before the readiness probe starts. increase this value if the pod is slow to fully start. |
| readinessProbe.periodSeconds | int | `10` | Period in seconds between readiness probe checks |
| readinessProbe.timeoutSeconds | int | `1` | Timeout in seconds for each readiness probe check |
| replicaCount | int | `1` | Number of replicas |
| resources | object | `{}` | Resource configuration |
| securityContext | object | `{}` | Security context |
| service.enabled | bool | `true` | Enable service |
| service.ipFamilies | list | `[]` | List of IP families to use for the service. Examples: - ["IPv4"] - ["IPv6"] - ["IPv4", "IPv6"] for dual-stack Leave empty to use cluster default behavior |
| service.ipFamilyPolicy | string | `"SingleStack"` | Defines how the service assigns IP families (IPv4/IPv6) Possible values: - SingleStack (default): Only one IP family, usually IPv4 - PreferDualStack: Use dual-stack if the cluster supports it, fallback to single - RequireDualStack: Fail if dual-stack cannot be assigned |
| service.ports.app.port | int | `7575` | Service port |
| service.ports.app.protocol | string | `"TCP"` | Service protocol |
| service.ports.app.targetPort | string | `"http"` | Service target port |
| service.type | string | `"ClusterIP"` | Service type |
| strategyType | string | `"RollingUpdate"` | `strategyType` specifies the strategy used to replace old Pods by new ones. `strategyType` can be `"Recreate"` or `"RollingUpdate"`. `"RollingUpdate"` is the default value and updates Pods in a rolling update fashion. `"Recreate"` will kill all existing Pods before new ones are created. The `"Recreate"` strategy is necessary when persistent volume's `accessMode` is set to `"ReadWriteOnce"` when using `helm upgrade`, as pod volume attachments to an existing PersistentVolumeClaim need to be cleared before a new pod can attach to it. |
| tolerations | list | `[]` | Node tolerations for pod scheduling |

---
Autogenerated from chart metadata using [helm-docs](https://github.com/norwoodj/helm-docs)
