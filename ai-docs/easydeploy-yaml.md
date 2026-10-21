# easydeploy.yaml

`easydeploy.yaml` is the application contract between a tenant repository and
EasyDeploy. Keep this YAML file at the repository root. It describes the project,
its visibility, and each service's image source, port, public access, health
checks, resources, and runtime settings. Workflow Service validates the file
before building images or changing Kubernetes resources.

This reference covers every property in format `v2`, including all nested
properties: 5 at the root, 18 directly inside each service, and 18 inside service
settings. Each property has a type, required/optional status, purpose,
constraints, and behavior when omitted. Current deployment limitations are
stated alongside the affected properties.

## Minimal descriptor

```yaml
apiVersion: v2
name: shop

services:
  - name: api
    port: 8000
```

This builds `api/Dockerfile` and creates a Deployment and ClusterIP Service.
The service is private because `public` is omitted. The deprecated `team` field
is optional.

The `ingress` property is deprecated and retained only as an alias for `public`.
Use `public: true` instead of `ingress: true`. Do not declare both properties on
the same service.

## Complete property map

`[]` denotes an array entry; `<NAME>` denotes a user-defined environment variable
name, not a literal key. All properties in this map are described below.

```text
apiVersion
name
team
groups[]
services[]
  name
  port
  dockerfile
  image
  image_from
  public
  ingress  # Deprecated; use public
  health
    path
    startup_delay
  resources
    requests
      cpu
      memory
    limits
      cpu
      memory
  scaling
    min
    max
    cpu_target
  stateful
  command[]
  args[]
  environment
    <NAME>: string
  init
    command[]
    args[]
  otel
    runtime
  persistence
    path
    size
  node
    gpu
    gpu_count
```

## Types and validation

Property names are case-sensitive. Use `apiVersion` exactly; multiword service
properties use snake case, such as `image_from` and `startup_delay`.

- An **identifier** is a string of 1–50 lowercase letters, digits, or hyphens,
  starting and ending with a letter or digit:
  `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`. This applies to project, service, and
  `image_from` names. Quote an entirely numeric name so it remains a string.
  Access-group names in `groups` use separate rules: they must be unique,
  non-blank strings and can contain uppercase letters.
- A **quantity** is a string matching the pattern below. Quote quantities,
  especially plain numeric CPU values such as `"1"`. Typical values are
  `"100m"` for CPU and `"256Mi"` for memory. The schema checks syntax; Kubernetes
  can impose additional constraints.
- A **string array** uses YAML list syntax, for example `["node", "src/index.js"]`.
  A single command string is not an array. Empty arrays are accepted.
- Omit an optional field instead of setting it to `null`; explicit nulls do not
  satisfy the schema. Unknown keys are rejected at every fixed object level.
  `environment` is the exception: it is a map of arbitrary keys to string values.

Quantity pattern:

```text
^[0-9]+(\.[0-9]+)?(m|k|Ki|M|Mi|G|Gi|T|Ti)?$
```

Some properties have a default declared by the v2 format that is not applied
automatically during deployment. The tables distinguish these declared defaults
from actual behavior when a property is omitted. In particular, health probes,
resource sizes, autoscaling, and telemetry injection are not enabled merely by
omitting their settings.

## Root properties

| Property | Type / required | Meaning and behavior when omitted |
| --- | --- | --- |
| `apiVersion` | String; optional | Selects the file format. Supported value: `v2`. Omission selects the current version, currently `v2`; `v2.0` and `v3` are not accepted. |
| `name` | Identifier; required | Project identity used for image repositories, namespaces (`{project}-{environment}`), ownership labels, and public hosts. |
| `team` | String; optional, deprecated | Accepted for compatibility but ignored by the current descriptor model. Ownership comes from project provisioning; this field does not transfer ownership or control visibility. |
| `groups` | Array of unique, non-blank strings; optional | EasyDeploy access-group names controlling project visibility. Omission or `[]` leaves visibility unrestricted at this boundary for authenticated EasyDeploy users. |
| `services` | Array of service objects; required, at least one entry | Services deployed from this repository. Each requires `name` and `port`. Give every service a unique name so image references identify one service unambiguously. File order determines the first public service. No default. |

## Project visibility

`groups` contains EasyDeploy access-group names, not GitHub collaborators or
service names:

```yaml
groups:
  - EasyDeploy-Developers
  - Shop-Operators
```

Workflow Service reads the groups retained by the newest completed deployment
in the first branch environment and compares them with the authenticated user's
configured memberships. A project with no completed deployment, no `groups`
property, or an empty list is visible to every authenticated EasyDeploy user.
Each group name must contain at least one non-whitespace character, and names
must be unique.

## Service identity, images, and networking

These properties belong inside each object in `services`, not at the root.

| Property | Type / required | Meaning and behavior when omitted |
| --- | --- | --- |
| `services[].name` | Identifier; required | Service identity, also used by `image_from`. Its Deployment, ClusterIP Service, and optional Ingress are named `{service}-{environment}`. No default. |
| `services[].port` | Integer, 1–65535; required | Container port, ClusterIP Service port/target port, and HTTP probe port. The app must listen on this port; the descriptor does not start a listener. |
| `services[].dockerfile` | Nonempty string; optional | Dockerfile path relative to the repository root. If `dockerfile`, `image`, and `image_from` are all absent, the path is `{service}/Dockerfile`. |
| `services[].image` | Nonempty string; optional | An existing container image reference, used as written. This service has no build/push step; the platform does not pin an external tag to a digest for you. The image must be pullable by the deployment. |
| `services[].image_from` | Identifier; optional | Reuse the resolved image of another service in this descriptor, retaining this service's own runtime settings. Forward references and reuse chains work; missing targets, self-references, and cycles fail deployment. |
| `services[].public` | Boolean; optional, actual default `false` | `true` creates an Ingress routing `/` to this service. Services are private by default. Use this property for new and updated descriptors. |
| `services[].ingress` | Boolean; optional, deprecated | Backward-compatible alias for `public`. Replace it with `public` when updating a descriptor. Do not declare both properties on the same service. |

Choose at most one of `dockerfile`, `image`, and `image_from` per service.
Specifying any pair is a schema error. Reusing an image does not express startup
ordering or a dependency on another service being ready.

The build context is the Dockerfile's containing directory.
`dockerfile: Dockerfile` builds from the repository root; `dockerfile: web/Dockerfile` builds
with `web/` as context. `COPY` and `.dockerignore` apply to that context, so files
outside it are unavailable to the build. There is no `context` or `build_args`
property in v2.

The first service with `public: true` (or the deprecated `ingress: true` alias)
receives the project's default host; additional public services add a
service-name suffix. For example, with project `shop` and public services `web`
then `api`, the `dev` hosts are `shop-dev.{domain}` and `shop-dev-api.{domain}`;
the release hosts are `shop.{domain}` and `shop-api.{domain}`. Reordering public
services can therefore change their URLs.
The environment suffix is omitted for the first configured tag environment,
not inherently for a name spelled `prod`. A composed host label longer than
63 characters fails rendering. The descriptor has no custom hostname, domain,
path, or TLS fields. Setting `public: true` does not configure TLS.

## Health checks

| Property | Type / required | Meaning and behavior when omitted |
| --- | --- | --- |
| `services[].health` | Object; optional | Configures HTTP readiness and liveness checks on the service port when `path` is present. Readiness determines whether the service can receive traffic; liveness detects when the container needs restarting. Omitted, `{}`, or only `startup_delay` means no probes. |
| `services[].health.path` | String beginning with `/`; optional | HTTP endpoint used by both checks, for example `/healthz`. Declared default: `/healthz`; it is not inserted automatically. Set the path explicitly to enable probes. |
| `services[].health.startup_delay` | Integer, 0–300 seconds; optional | Delay after container startup before readiness and liveness checks begin. Declared default: `10`; when omitted, no explicit initial delay is configured. Set it explicitly if the app needs startup time. This does not create a separate startup probe. |

Example `health` block inside a service:

```yaml
    health:
      path: /healthz
      startup_delay: 10
```

## Resources and replicas

| Property | Type / required | Meaning and behavior when omitted |
| --- | --- | --- |
| `services[].resources` | Object; optional | CPU and memory settings for each service container. Omitted means no explicit requests or limits; cluster policy may supply defaults. |
| `services[].resources.requests` | Object; optional | Resources requested when scheduling each container. Only supplied CPU/memory values are set; no defaults are added by this file. |
| `services[].resources.requests.cpu` | Quantity string; optional | CPU requested per container, e.g. `"100m"` for 0.1 CPU or `"1"` for one CPU. No application-level default. |
| `services[].resources.requests.memory` | Quantity string; optional | Memory requested per container, e.g. `"256Mi"`. No application-level default. |
| `services[].resources.limits` | Object; optional | Maximum CPU and memory available to each container. Only supplied CPU/memory values are set; no defaults are added by this file. |
| `services[].resources.limits.cpu` | Quantity string; optional | CPU usage limit, e.g. `"500m"` for 0.5 CPU. CPU use above the limit is throttled. No application-level default. |
| `services[].resources.limits.memory` | Quantity string; optional | Memory usage limit, e.g. `"512Mi"`. Exceeding the limit can cause the container to be terminated for running out of memory. No application-level default. |
| `services[].scaling` | Object; optional | Replica settings. Currently only `min` takes effect, as a fixed replica count; the renderer does not create a HorizontalPodAutoscaler. |
| `services[].scaling.min` | Integer, at least 1; optional | Sets Deployment replicas; actual default `1` when this field or `scaling` is absent. Scale-to-zero is not accepted. |
| `services[].scaling.max` | Integer, at least 1; optional | Desired upper bound for automatic replica scaling. Currently accepted but ignored, so it does not set an effective upper bound. No default. |
| `services[].scaling.cpu_target` | Integer, 1–100; optional | Desired CPU utilization percentage for automatic replica scaling, e.g. `80`. Currently accepted but ignored. No default. |

Keep requests within limits. Do not treat `100m`/`256Mi` requests,
`500m`/`512Mi` limits, or `max: 3`/`cpu_target: 80` from example configurations as
platform defaults. The schema does not compare requests with limits or `min`
with `max`; if recording future scaling settings, keep `min <= max` yourself.

## Command, arguments, and environment

| Property | Type / required | Meaning and behavior when omitted |
| --- | --- | --- |
| `services[].command` | String array; optional | Container entrypoint override. Omitted or `[]` leaves the image's ENTRYPOINT in use. |
| `services[].args` | String array; optional | Container argument override. Omitted or `[]` leaves the image's default arguments (CMD) in use. |
| `services[].environment` | Map of string values; optional | Runtime environment variables for this service. Each key is a variable name, and each value must be a string. Omitted or `{}` means no variables supplied by this file. These are not Docker build arguments or deployment-environment selectors. |

Commands and arguments are lists, not shell command lines. For shell syntax,
the selected image must contain a shell and you must invoke it explicitly, for
example `command: ["sh", "-c"]` with `args: ["exec node src/index.js"]`.

Quote environment values, including numbers and booleans:

```yaml
    environment:
      LOG_LEVEL: "info"
      FEATURE_ENABLED: "false"
```

Values explicitly set in `environment` take precedence over values imported
from the namespace's `project-secrets` Secret. Do not put secrets in this field.

## Stateful services

| Property | Type / required | Meaning and behavior when omitted |
| --- | --- | --- |
| `services[].stateful` | Boolean; optional, default `false` | Selects the workload type: `false` means a Deployment; `true` requests a StatefulSet with stable replica identities. Currently `true` is not supported and stops deployment before building images. Omit this property or use `false`. |

`stateful` does not specify a disk or mount path. Storage is a separate setting
under `persistence`, which is also currently unavailable.

## Initialization

| Property | Type / required | Meaning and behavior when omitted |
| --- | --- | --- |
| `services[].init` | Object; optional | Describes an initialization container that would run before the main service container. Omitted means no initialization container. Currently any present object, including `{}`, stops deployment before building images. |
| `services[].init.command` | String array; optional | Entrypoint override for the initialization container, e.g. `["sh", "-c"]`. Omission is an empty list with no command override. The enclosing `init` setting is currently unavailable. |
| `services[].init.args` | String array; optional | Arguments for the initialization command, e.g. `["npm run migrate"]`. Omission is an empty list with no argument override. The enclosing `init` setting is currently unavailable. |

The `init` object accepts only `command` and `args`; it has no separate `image`,
`environment`, or resource properties. Initialization commands are not executed
as part of a Docker build.

## Telemetry

| Property | Type / required | Meaning and behavior when omitted |
| --- | --- | --- |
| `services[].otel` | Object; optional | OpenTelemetry auto-instrumentation settings for this service. Currently accepted but has no effect; omitting it does not enable instrumentation. |
| `services[].otel.runtime` | String enum; optional | Selects the runtime for auto-instrumentation: `nodejs`, `python`, `java`, `dotnet`, or `go`; `none` declares that automatic instrumentation is not wanted. Declared default: `nodejs`, not automatically applied. Currently all values have no effect on deployment. |

Use exactly the lowercase runtime names above. Values such as `node`, `bun`,
`ruby`, or `rust` are not accepted. `otel.runtime` does not install a language
runtime or change the image's start command.

## Persistent storage

| Property | Type / required | Meaning and behavior when omitted |
| --- | --- | --- |
| `services[].persistence` | Object; optional | Describes storage intended to retain data beyond the life of a container. Omitted means no persistent volume requested by this file. Currently any present block stops deployment before building images; no volume or mount is created. |
| `services[].persistence.path` | String beginning with `/`; required when `persistence` exists | Absolute mount path inside the service container, e.g. `/data`. It is not a repository path or host directory. No default; a persistence block without it is invalid. |
| `services[].persistence.size` | Quantity string; optional | Requested volume capacity, e.g. `"10Gi"`. Declared default: `"1Gi"`, not automatically applied. Persistent storage is currently unavailable. |

The object accepts only `path` and `size`. Storage class, access mode, existing
volume references, and multiple volumes are not configurable in this format.

## Node and GPU settings

| Property | Type / required | Meaning and behavior when omitted |
| --- | --- | --- |
| `services[].node` | Object; optional | Declares GPU requirements for scheduling the service. Currently accepted but has no effect on node placement or GPU allocation. Omission adds no node requirements. |
| `services[].node.gpu` | Boolean; optional | Whether the service requests GPU resources. Declared default: `false`. If `true`, `gpu_count` must be explicitly set to at least 1. Currently this setting does not allocate a GPU. |
| `services[].node.gpu_count` | Integer, at least 0; optional unless `gpu: true` | Number of GPU devices requested per service replica. Declared default: `0`. With `gpu: true`, omission or `0` is invalid. Currently this setting has no effect on GPU allocation. |

For example, `node: { gpu: true, gpu_count: 1 }` passes the format's GPU checks,
but GPU scheduling is currently unavailable. Node names, selectors, affinity,
and tolerations are not properties of this object.

## Unsupported keys

There are no `dev`, `tst`, or `prod` selectors, branch or tag rules, registry
locations, cluster names, deployment credentials, or per-environment descriptor
overrides in v2. `services[].environment` contains application variables, not
environment names.

There is no root `environment`, `environments`, `state`, or `version` field, no
`services[].environments`, and no arbitrary Kubernetes configuration passthrough.
Keys such as `replicas`, `build`, `context`, `build_args`, `depends_on`, `volumes`,
`ports`, and custom probe settings are not part of v2 and are rejected.
Use `scaling.min`, `port`, and the other documented fields in their exact nesting.

## Validation errors

Validation runs before image work. Invalid YAML, an unsupported `apiVersion`,
missing required properties, unknown keys, invalid identifiers, conflicting
image sources, and invalid value ranges fail the descriptor step without retrying.
A schema-valid descriptor requesting `stateful: true`, `persistence`, or `init`
also fails before image work with a non-retryable descriptor error naming the
service and unsupported field.
