# EasyDeploy Template

Creating a project in EasyDeploy creates its Git repository and deploys this
welcome template. The initial deployment shows a page with instructions and
project links. It confirms that the template is running; the real application
still needs to be added.

When asked to build or import an application, replace the welcome app with the
requested project. The template's Node.js code, page, and logo are scaffolding;
choose the runtime, framework, and source layout the actual application needs.

## Replace the template

1. Work in the generated repository and preserve its Git history. If it is not
   cloned yet, use the ready-to-run clone command from the welcome page.
2. Replace the template source and unused assets with the real application,
   including its dependencies, lockfiles, build configuration, and tests. When
   importing an app, leave its original repository unchanged; do not copy its
   `.git/`, `easydeploy.yaml`, private `.env` files, credentials, installed
   dependencies, or local build output.
3. Preserve the generated EasyDeploy project, team, service names, and port.
   `PROJECT_NAME`, `SERVICE_NAME`, and `PORT` are already filled in `.env`; read
   these values instead of asking the user to enter them again.
4. Update the root `Dockerfile` to build and start the real application from
   committed files. Match its runtime, dependencies, assets, and start command;
   replace the template's Node.js image and command if the runtime changes.
5. Listen on `0.0.0.0` at the configured port and keep `GET /healthz` returning
   HTTP 200. The app must read `PORT` or otherwise use that same port; the
   template's `.env` loading code does not carry over to another runtime.
6. Update `.gitignore`, `.dockerignore`, and project instructions for the real
   app. Keep secrets out of Git and the image. The tracked `.env` must contain
   public defaults only; configure private and environment-specific values on
   the project's Variables page, separately for dev and prod.

## Deployment configuration

[Read the easydeploy.yaml reference and editing rules](ai-docs/easydeploy-yaml.md).

## Check before deploying

Run the application's tests, build the image, and start the container. Resolve
`${PROJECT_NAME}` and `${PORT}` below from the existing `.env` before running
these command patterns; the shell does not load `.env` automatically.

```text
docker build -t "${PROJECT_NAME}:local" .
docker run --rm --env-file .env -p "127.0.0.1:${PORT}:${PORT}" "${PROJECT_NAME}:local"
```

In another terminal, check the real application's page, assets, and health:

```text
curl --fail "http://localhost:${PORT}/"
curl --fail "http://localhost:${PORT}/healthz"
```

Confirm the container serves the requested application. Review the changes and
staged files, including the Dockerfile and deployment settings, before committing;
include only the intended app changes and no secrets.

## Deploy to dev

Commit the tested changes on an up-to-date `main` branch in the generated
repository, then push when branch rules allow it:

```bash
git push origin main
```

If branch rules require a pull request, merge the tested changes into `main`
instead. The push or merge triggers the dev build and deployment. Local edits
alone do not deploy.

Check the deployment in the project detail (see "When a deploy fails"), then
verify the application at the `url` of each public service in its `dev`
environment. Do not compose or guess application hosts.

## Deploy to prod

After verifying the intended commit in dev, create a new version tag beginning
with `v` on that exact commit and push the tag. If the verified commit is `HEAD`:

```bash
git log -1 --oneline
# Use a new, unused release version.
git tag v1.0.0 HEAD
git push origin refs/tags/v1.0.0
```

Otherwise, use the verified commit SHA instead of `HEAD`. Never move an existing
release tag. Pushing the tag triggers the production deployment; pushing `main`
alone does not.

Check the deployment in the project detail, then verify the application at the
`url` of each public service in its `prod` environment.

## When a deploy fails

1. Read the current known problems at
   `https://github.com/DLR-easydeploy/EasyDeploy-template/blob/main/ai-docs/known-problems.md`.
   Do not rely on a local `ai-docs/known-problems.md`: it is frozen at the
   version copied when the project was created.
2. Call the EasyDeploy API of the platform this project lives on, with the
   user's DXM bearer token in `Authorization: Bearer <token>`. Ask the user for
   the API base URL and the token if you do not have them. Never write the
   token to a file, a commit, or the image.

```text
GET /api/v1/projects/${PROJECT_NAME}
GET /api/v1/workflows/${WORKFLOW_ID}
GET /api/v1/projects/${PROJECT_NAME}/environments/${ENVIRONMENT}/services/${SERVICE_NAME}/logs?follow=false
```

- The project detail lists every service in every environment with `health`,
  `degradedReasons`, pods, and `url`, the service's real address. Take all
  application URLs from `url`; it is absent while a service is not public.
- The workflow shows each step's status and the failed step's message. A
  project creation's id is `provisioning.workflowId` in the project detail. A
  deploy's id is `deploy-<org>-<repository>-<environment>-<version>`, where
  `<version>` is the full commit SHA for `dev` and the tag for `prod`, for
  example `deploy-DLR-easydeploy-my-project-dev-<sha>`.
- The logs call returns recent lines as `text/event-stream` and then closes.
  Read the startup errors there.

Match what you found to a symptom in the known problems, fix the repository,
and deploy again.
