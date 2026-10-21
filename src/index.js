const http = require('http');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { renderGuide } = require('./guide');

// Load the optional project-root .env without overriding existing environment variables.
try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing environment variable: ${name}. Set it in .env or the process environment.`);
  }
  return value;
}

function appendUrlPath(baseUrl, urlPath) {
  return baseUrl.replace(/\/+$/, '') + '/' + urlPath.replace(/^\/+/, '');
}

function gitCloneUrls(repoUrl) {
  const { host, hostname, pathname } = new URL(repoUrl);
  const repoPath = pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '');
  return {
    https: `https://${host}/${repoPath}.git`,
    ssh: `git@${hostname}:${repoPath}.git`,
  };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

const PORT = requiredEnv('PORT');
const PROJECT_NAME = requiredEnv('PROJECT_NAME');
const SERVICE_NAME = requiredEnv('SERVICE_NAME');
const ENV = requiredEnv('DEPLOYMENT_ENV');

const BASE_DOMAIN   = requiredEnv('BASE_DOMAIN');
const VARIABLES_URL = requiredEnv('VARIABLES_URL');
const GRAFANA_URL   = requiredEnv('GRAFANA_URL');
const PORTAL_URL    = requiredEnv('PORTAL_URL');
const REPO_URL      = requiredEnv('REPO_URL');

const DEV_URL = `https://${PROJECT_NAME}${process.env.DEV_URL_SUFFIX || ''}.${BASE_DOMAIN}/`;
const PROD_URL = `https://${PROJECT_NAME}${process.env.PROD_URL_SUFFIX || ''}.${BASE_DOMAIN}/`;
const PROJECT_VARIABLES_URL = appendUrlPath(VARIABLES_URL, PROJECT_NAME);
const GRAFANA_DASH = appendUrlPath(
  GRAFANA_URL,
  (process.env.GRAFANA_DASH_PREFIX || '') + SERVICE_NAME +
    (process.env.GRAFANA_DASH_SUFFIX || '') + '/' + SERVICE_NAME
);
const GIT_URL = appendUrlPath(REPO_URL, PROJECT_NAME + (process.env.REPO_URL_SUFFIX || ''));
const { https: GIT_HTTPS_URL, ssh: GIT_SSH_URL } = gitCloneUrls(GIT_URL);

const FAVICON = readFileSync(path.join(__dirname, 'favicon.svg'));
const MARKDOWN_DOCUMENTS = new Map([
  ['/AGENTS.md', readFileSync(path.join(__dirname, '..', 'AGENTS.md'), 'utf8')],
  ['/ai-docs/easydeploy-yaml.md', readFileSync(path.join(__dirname, '..', 'ai-docs', 'easydeploy-yaml.md'), 'utf8')],
]);
const GUIDE = renderGuide(MARKDOWN_DOCUMENTS.get('/AGENTS.md'));
const GUIDE_CHEVRON = '<svg class="guide-chevron" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="m5 7 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function cloneInstructions(extraCommands = '') {
  return `<div class="clone-protocol" role="group" aria-label="Git clone protocol">
    <button type="button" class="clone-option" data-clone-protocol="https" aria-pressed="false" onclick="showCloneProtocol('https')">HTTPS</button>
    <button type="button" class="clone-option active" data-clone-protocol="ssh" aria-pressed="true" onclick="showCloneProtocol('ssh')">SSH</button>
  </div>
  <pre><span data-clone-command data-https="git clone ${escapeHtml(GIT_HTTPS_URL)}" data-ssh="git clone ${escapeHtml(GIT_SSH_URL)}">git clone ${escapeHtml(GIT_SSH_URL)}</span>
cd ${escapeHtml(PROJECT_NAME)}${escapeHtml(extraCommands)}</pre>`;
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${SERVICE_NAME} — EasyDeploy</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" sizes="any">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600&family=Red+Hat+Display:wght@700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary:       #1456E0;
      --primary-dark:  #0D2497;
      --primary-light: #E7EEFC;
      --primary-muted: #A1BCF3;
      --text:          #092241;
      --text-2:        rgba(9,34,65,.75);
      --bg:            #F5F7FE;
      --white:         #FFFFFF;
      --border:        #D0DAF5;
      --font-h: 'Red Hat Display', sans-serif;
      --font-b: 'Open Sans', sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font-b); background: var(--bg); color: var(--text); font-size: 14px; line-height: 20px; }

    /* logo */
    .brand {
      display: flex; align-items: center; gap: 10px; margin-bottom: 24px;
      font-family: var(--font-h); font-size: 14px; font-weight: 700; color: var(--primary);
    }
    .brand img { display: block; width: 28px; height: 28px; flex-shrink: 0; }

    /* main */
    .main { min-height: 100vh; }
    .page-header { padding: 28px 32px 16px; }
    h1 { font-family: var(--font-h); font-size: 32px; font-weight: 700; color: var(--text); }
    .page-sub { font-size: 14px; font-weight: 500; color: var(--text-2); margin-top: 8px; }
    .page-body { padding: 8px 32px 48px; display: flex; flex-direction: column; gap: 32px; }

    /* section */
    .section-title { font-family: var(--font-h); font-size: 20px; font-weight: 700; color: var(--primary); margin-bottom: 16px; }
    .card { background: var(--white); border-radius: 12px; padding: 24px; }

    /* links grid */
    .links-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .link-tile {
      display: flex; flex-direction: column; gap: 4px;
      background: var(--bg); border: 1px solid var(--border); border-radius: 10px;
      padding: 14px 18px; text-decoration: none; min-width: 200px; flex: 1;
      transition: border-color .15s;
    }
    .link-tile:hover { border-color: var(--primary); }
    .lt-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: var(--primary-muted); }
    .lt-url   { font-size: 13px; color: var(--primary); font-family: monospace; word-break: break-all; }

    /* steps */
    .steps { display: flex; flex-direction: column; gap: 0; }
    .step { display: flex; gap: 16px; padding: 16px 0; border-bottom: 1px solid #F0F3FD; }
    .step:last-child { border-bottom: none; }
    .step-num {
      width: 28px; height: 28px; border-radius: 50%; background: var(--primary);
      color: #fff; font-family: var(--font-h); font-weight: 700; font-size: 13px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
    }
    .step-body { flex: 1; }
    .step-title { font-weight: 600; font-size: 14px; color: var(--text); margin-bottom: 6px; }
    .step-desc  { font-size: 13px; color: var(--text-2); line-height: 1.6; }

    /* code blocks */
    pre {
      background: #0d1117; color: #e6edf3; border-radius: 8px;
      padding: 14px 16px; font-size: 12px; line-height: 1.6;
      overflow-x: auto; margin: 8px 0; font-family: 'Courier New', monospace;
    }
    code { font-family: 'Courier New', monospace; font-size: 12px; background: var(--primary-light); color: var(--primary); padding: 1px 5px; border-radius: 4px; }

    /* Git clone protocol */
    .clone-protocol {
      display: inline-flex; gap: 4px; padding: 3px; margin-top: 10px;
      border: 1px solid var(--border); border-radius: 8px; background: var(--bg);
    }
    .clone-option {
      padding: 5px 12px; border: 0; border-radius: 5px; cursor: pointer;
      font: inherit; font-weight: 600; color: var(--text-2); background: transparent;
    }
    .clone-option.active { background: var(--primary); color: #fff; }
    .clone-option:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

    /* runtime tabs */
    .tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .tab {
      padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;
      cursor: pointer; border: 1px solid var(--border); background: var(--bg); color: var(--text-2);
      transition: all .15s;
    }
    .tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .runtime { display: none; }
    .runtime.active { display: block; }

    /* table */
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: var(--text-2); padding: 8px 12px; border-bottom: 2px solid var(--border); }
    td { padding: 10px 12px; border-bottom: 1px solid #F0F3FD; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .var-name { font-family: monospace; color: var(--primary); font-weight: 600; }
    .req-badge { background: #FFF0F3; color: #c0003a; border-radius: 4px; padding: 1px 6px; font-size: 10px; font-weight: 700; }
    .opt-badge { background: var(--primary-light); color: var(--primary); border-radius: 4px; padding: 1px 6px; font-size: 10px; font-weight: 700; }

    /* warning box */
    .warn { background: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 14px 16px; font-size: 13px; color: #92400E; margin-bottom: 16px; line-height: 1.6; }
    .info { background: var(--primary-light); border-left: 4px solid var(--primary); border-radius: 8px; padding: 14px 16px; font-size: 13px; color: var(--primary-dark); margin-bottom: 16px; line-height: 1.6; }

    /* project guide */
    .project-guide { min-width: 0; border: 1px solid var(--border); border-radius: 12px; background: var(--white); }
    .project-guide summary { list-style: none; cursor: pointer; }
    .project-guide summary::-webkit-details-marker { display: none; }
    .project-guide summary:focus-visible, .guide-download:focus-visible {
      outline: 2px solid var(--primary); outline-offset: 4px; border-radius: 6px;
    }
    .guide-summary { display: flex; align-items: center; gap: 16px; padding: 24px; border-radius: 12px; }
    .guide-summary:hover { background: var(--bg); }
    .guide-icon {
      display: grid; place-items: center; flex-shrink: 0; width: 48px; height: 48px;
      background: var(--primary-light); color: var(--primary); border-radius: 12px;
    }
    .guide-heading { flex: 1; min-width: 0; }
    .guide-heading h2 { font-family: var(--font-h); font-size: 20px; line-height: 1.3; color: var(--primary); }
    .guide-heading p { margin-top: 5px; color: var(--text-2); font-size: 13px; line-height: 1.6; }
    .guide-badge { padding: 4px 9px; border: 1px solid var(--border); border-radius: 6px; color: var(--primary); font: 12px monospace; }
    .guide-chevron { flex-shrink: 0; color: var(--primary); transition: transform .18s ease; }
    details[open] > summary > .guide-chevron { transform: rotate(180deg); }
    .guide-content { border-top: 1px solid var(--border); padding: 24px; }
    .guide-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    .guide-caption { display: flex; flex-direction: column; gap: 4px; }
    .guide-caption span { font-size: 12px; color: var(--text-2); }
    .guide-download {
      display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--border);
      border-radius: 8px; padding: 8px 12px; color: var(--primary); text-decoration: none; font-weight: 600; font-size: 12px;
    }
    .guide-download:hover { background: var(--primary-light); border-color: var(--primary); }
    .guide-chapters { display: flex; flex-direction: column; gap: 8px; }
    .guide-chapter { min-width: 0; border: 1px solid var(--border); border-radius: 8px; }
    .guide-chapter > summary { display: flex; align-items: center; gap: 12px; padding: 15px 16px; border-radius: 8px; }
    .guide-chapter > summary:hover, .guide-chapter[open] > summary { background: var(--bg); }
    .guide-number { color: var(--primary); font: 12px monospace; flex-shrink: 0; }
    .guide-chapter h3 { flex: 1; font-size: 13px; font-weight: 600; line-height: 1.6; }
    .guide-markdown { padding: 4px 20px 20px; color: var(--text-2); font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; }
    .guide-markdown > * { margin-top: 14px; }
    .guide-markdown h4 { color: var(--text); font-size: 14px; margin-top: 24px; }
    .guide-markdown ul, .guide-markdown ol { padding-left: 22px; }
    .guide-markdown li + li { margin-top: 8px; }
    .guide-markdown pre { max-width: 100%; overflow-wrap: normal; }
    .guide-markdown pre code { background: transparent; color: inherit; padding: 0; border-radius: 0; }
    @media (max-width: 600px) {
      .guide-summary { display: grid; grid-template-columns: 40px minmax(0, 1fr) 20px; padding: 18px 16px; gap: 12px; }
      .guide-icon { width: 40px; height: 40px; }
      .guide-badge { grid-column: 2; grid-row: 2; justify-self: start; }
      .guide-summary > .guide-chevron { grid-column: 3; grid-row: 1; }
      .guide-content { padding: 16px; }
      .guide-chapter > summary { padding: 12px; gap: 10px; }
      .guide-markdown { padding: 0 12px 16px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .guide-chevron { transition: none; }
    }
  </style>
</head>
<body>

<div class="main">
  <header class="page-header">
    <div class="brand">
      <img src="/favicon.svg" alt="" width="28" height="28">
      <span>EasyDeploy</span>
    </div>
    <h1>🚀 ${SERVICE_NAME} is live</h1>
    <p class="page-sub">This is the EasyDeploy template app. Replace it with your own code — everything else is already wired up.</p>
  </header>

  <div class="page-body">

    <!-- Links -->
    <section>
      <div class="section-title">Your endpoints &amp; services</div>
      <div class="card">
        <div class="links-grid">
          <a class="link-tile" href="${DEV_URL}" target="_blank">
            <span class="lt-label">Dev URL</span>
            <span class="lt-url">${DEV_URL.replace('https://', '')}</span>
          </a>
          <a class="link-tile" href="${PROD_URL}" target="_blank">
            <span class="lt-label">Prod URL</span>
            <span class="lt-url">${PROD_URL.replace('https://', '')}</span>
          </a>
          <a class="link-tile" href="${GRAFANA_DASH}" target="_blank">
            <span class="lt-label">Grafana dashboard</span>
            <span class="lt-url">Metrics, logs, traces</span>
          </a>
          <a class="link-tile" href="${PROJECT_VARIABLES_URL}" target="_blank">
            <span class="lt-label">Variables — project: ${PROJECT_NAME}</span>
            <span class="lt-url">Environment variables &amp; secrets</span>
          </a>
          <a class="link-tile" href="${GIT_URL}" target="_blank">
            <span class="lt-label">GitHub repo</span>
            <span class="lt-url">${GIT_URL}</span>
          </a>
          <a class="link-tile" href="${PORTAL_URL}" target="_blank">
            <span class="lt-label">Deploy a new app</span>
            <span class="lt-url">Create another app from the portal</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Deploy your app -->
    <section>
      <div class="section-title">Deploy your app</div>
      <div class="card">
        <div class="tabs" style="margin-bottom:20px">
          <button class="tab active" onclick="showPath('existing')">I already have an app</button>
          <button class="tab" onclick="showPath('fresh')">I'm starting fresh</button>
        </div>

        <!-- Existing app path -->
        <div id="path-existing" class="deploy-path">
          <div class="steps">
            <div class="step">
              <div class="step-num">1</div>
              <div class="step-body">
                <div class="step-title">Add a <code>/healthz</code> endpoint</div>
                <div class="step-desc">
                  Must return HTTP 200. That's the only platform requirement.
                  <pre># Node.js
if (req.url === '/healthz') {
  res.writeHead(200); res.end('{"status":"ok"}'); return;
}

# Python / FastAPI
@app.get("/healthz")
def health(): return {"status": "ok"}

# Go
mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
  w.Write([]byte(\`{"status":"ok"}\`))
})</pre>
                </div>
              </div>
            </div>
            <div class="step">
              <div class="step-num">2</div>
              <div class="step-body">
                <div class="step-title">Clone this repo and copy your code in</div>
                <div class="step-desc">
                  This repo is already wired up — CI, environment variables, <code>easydeploy.yaml</code>. Choose HTTPS or SSH, then bring your source files.
                  ${cloneInstructions('\n# copy your src/ and Dockerfile from your existing project\n# do NOT copy easydeploy.yaml — it\'s already configured')}
                </div>
              </div>
            </div>
            <div class="step">
              <div class="step-num">3</div>
              <div class="step-body">
                <div class="step-title">Push</div>
                <div class="step-desc">
                  <pre>git add -A
git commit -m "feat: initial deploy"
git push origin main</pre>
                  Watch progress in the <a href="${PORTAL_URL}" target="_blank" style="color:var(--primary)">portal</a>.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Starting fresh path -->
        <div id="path-fresh" class="deploy-path" style="display:none">
          <div class="steps">
            <div class="step">
              <div class="step-num">1</div>
              <div class="step-body">
                <div class="step-title">Clone this repo</div>
                <div class="step-desc">
                  Everything is already wired up — CI and environment variables. Choose HTTPS or SSH, then replace the code.
                  ${cloneInstructions()}
                </div>
              </div>
            </div>
            <div class="step">
              <div class="step-num">2</div>
              <div class="step-body">
                <div class="step-title">Replace <code>src/</code> and update the <code>Dockerfile</code></div>
                <div class="step-desc">
                  Delete the template files in <code>src/</code> and add your own. Update the <code>Dockerfile</code> to build your app. The only requirements: expose the correct port and have a <code>/healthz</code> endpoint that returns HTTP 200.
                </div>
              </div>
            </div>
            <div class="step">
              <div class="step-num">3</div>
              <div class="step-body">
                <div class="step-title">Push</div>
                <div class="step-desc">
                  <pre>git add -A
git commit -m "feat: replace template with my app"
git push</pre>
                  Watch progress in the <a href="${PORTAL_URL}" target="_blank" style="color:var(--primary)">portal</a>.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Secrets -->
    <section>
      <div class="section-title">Environment variables &amp; secrets</div>
      <div class="card">
        <div class="info">Manage environment variables and secrets on your <strong>project page</strong> in the EasyDeploy portal. They are injected into your pods automatically — no redeploy needed when you change them (updated within ~5 minutes).</div>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-body">
              <div class="step-title">Open project variables</div>
              <div class="step-desc">Go to <a href="${PROJECT_VARIABLES_URL}" target="_blank" style="color:var(--primary)">${PROJECT_VARIABLES_URL}</a> to manage variables for <strong>${PROJECT_NAME}</strong>.</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-body">
              <div class="step-title">Add variables and secrets per environment</div>
              <div class="step-desc">Use the <strong>dev</strong> environment for dev deployments and <strong>prod</strong> for production. Secrets in each environment are scoped — <code>prod</code> secrets are never visible in dev pods.</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-body">
              <div class="step-title">Use them in your app</div>
              <div class="step-desc">Read them as normal environment variables: <code>process.env.MY_SECRET</code> / <code>os.environ["MY_SECRET"]</code> / <code>os.Getenv("MY_SECRET")</code></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Observability -->
    <section>
      <div class="section-title">Observability — OpenTelemetry setup</div>
      <div class="card">
        <p style="margin-bottom:16px;font-size:13px;color:var(--text-2)">
          The OTel Operator is installed. For <strong>Node.js, Java, Python, and .NET</strong> the operator injects the agent into your pod automatically — no code changes needed.
          For <strong>Go and Bun</strong> auto-injection is not supported; add the SDK manually instead.
        </p>
        <p style="margin-bottom:16px;font-size:13px;color:var(--text-2)">
          The following env vars are pre-set in every pod:
        </p>
        <table style="margin-bottom:24px">
          <thead><tr><th>Variable</th><th>Value</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td class="var-name">OTEL_SERVICE_NAME</td><td><code>${SERVICE_NAME}</code></td><td>Auto-set by Helm chart for telemetry</td></tr>
            <tr><td class="var-name">OTEL_EXPORTER_OTLP_ENDPOINT</td><td><em>cluster-internal collector</em></td><td>Auto-set by Helm chart</td></tr>
            <tr><td class="var-name">OTEL_EXPORTER_OTLP_PROTOCOL</td><td><code>http/protobuf</code></td><td>Auto-set by Helm chart</td></tr>
          </tbody>
        </table>

        <div class="tabs">
          <button class="tab active" onclick="showRuntime('node')">Node.js</button>
          <button class="tab" onclick="showRuntime('java')">Java</button>
          <button class="tab" onclick="showRuntime('python')">Python</button>
          <button class="tab" onclick="showRuntime('bun')">Bun</button>
          <button class="tab" onclick="showRuntime('go')">Go</button>
        </div>

        <div id="rt-node" class="runtime active">
          <div class="info" style="margin-bottom:12px">
            <strong>Auto-instrumented.</strong> The operator already injects the Node.js OTel agent — HTTP, DB, and outgoing requests are traced with zero code changes.
          </div>
          <div class="step-title" style="margin-bottom:8px">Structured logs (stdout → Loki)</div>
          <pre>const log = (level, message, extra = {}) =>
  console.log(JSON.stringify({ level, message, app: process.env.OTEL_SERVICE_NAME, ...extra }))

log('info', 'server started', { port: 3000 })
log('error', 'something failed', { error: err.message })</pre>
          <div class="step-title" style="margin:12px 0 8px">Custom spans (optional)</div>
          <pre>const { trace, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('${SERVICE_NAME}');

async function myOp() {
  return tracer.startActiveSpan('my-op', async span => {
    try {
      // ... your code
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  });
}</pre>
        </div>

        <div id="rt-java" class="runtime">
          <div class="info" style="margin-bottom:12px">
            <strong>Auto-instrumented.</strong> Set <code>otel.runtime: java</code> on the matching service in <code>easydeploy.yaml</code> — the operator injects the Java agent jar. No code changes needed.
          </div>
          <div class="step-title" style="margin-bottom:8px">Update the matching service in <code>easydeploy.yaml</code></div>
          <pre>services:
  - name: ${SERVICE_NAME}
    port: 8080
    otel:
      runtime: java</pre>
          <div class="step-title" style="margin:12px 0 8px">Structured logs (stdout → Loki)</div>
          <pre>import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

var mapper = new ObjectMapper();
System.out.println(mapper.writeValueAsString(Map.of(
    "level", "info", "message", "server started",
    "app", System.getenv("OTEL_SERVICE_NAME")
)));</pre>
        </div>

        <div id="rt-python" class="runtime">
          <div class="info" style="margin-bottom:12px">
            <strong>Auto-instrumented.</strong> Set <code>otel.runtime: python</code> on the matching service in <code>easydeploy.yaml</code> — the operator wraps your process with <code>opentelemetry-instrument</code>. No code changes needed.
          </div>
          <div class="step-title" style="margin-bottom:8px">Update the matching service in <code>easydeploy.yaml</code></div>
          <pre>services:
  - name: ${SERVICE_NAME}
    port: 3000
    otel:
      runtime: python</pre>
          <div class="step-title" style="margin:12px 0 8px">Structured logs (stdout → Loki)</div>
          <pre>import json, os

def log(level, message, **extra):
    print(json.dumps({"level": level, "message": message,
        "app": os.environ.get("OTEL_SERVICE_NAME"), **extra}))

log("info", "server started", port=3000)</pre>
        </div>

        <div id="rt-bun" class="runtime">
          <div class="warn" style="margin-bottom:12px">
            <strong>Manual SDK required.</strong> Bun is not compatible with the Node.js OTel operator injector. Add the SDK to your code and set <code>otel.runtime: none</code> on the matching service in <code>easydeploy.yaml</code>.
          </div>
          <div class="step-title" style="margin-bottom:8px">Update the matching service in <code>easydeploy.yaml</code></div>
          <pre>services:
  - name: ${SERVICE_NAME}
    port: 3000
    otel:
      runtime: none</pre>
          <div class="step-title" style="margin:12px 0 8px">1. Install packages</div>
          <pre>bun add @opentelemetry/sdk-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/sdk-metrics</pre>
          <div class="step-title" style="margin:12px 0 8px">2. Create <code>src/instrumentation.ts</code></div>
          <pre>import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 15_000,
  }),
});
sdk.start();
process.on('SIGTERM', () => sdk.shutdown());</pre>
          <div class="step-title" style="margin:12px 0 8px">3. Import first in <code>src/index.ts</code></div>
          <pre>import './instrumentation'; // must be first import

// ... your app</pre>
          <div class="step-title" style="margin:12px 0 8px">Structured logs</div>
          <pre>const log = (level: string, message: string, extra = {}) =>
  console.log(JSON.stringify({ level, message, app: process.env.OTEL_SERVICE_NAME, ...extra }));

log('info', 'server started', { port: 3000 });</pre>
        </div>

        <div id="rt-go" class="runtime">
          <div class="warn" style="margin-bottom:12px">
            <strong>Manual SDK required.</strong> Go eBPF auto-instrumentation is not enabled. Add the SDK to your code and set <code>otel.runtime: none</code> on the matching service in <code>easydeploy.yaml</code>.
          </div>
          <div class="step-title" style="margin-bottom:8px">Update the matching service in <code>easydeploy.yaml</code></div>
          <pre>services:
  - name: ${SERVICE_NAME}
    port: 3000
    otel:
      runtime: none</pre>
          <div class="step-title" style="margin:12px 0 8px">1. Add dependencies</div>
          <pre>go get go.opentelemetry.io/otel \
  go.opentelemetry.io/otel/sdk/trace \
  go.opentelemetry.io/otel/sdk/metric \
  go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp \
  go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp \
  go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp</pre>
          <div class="step-title" style="margin:12px 0 8px">2. Create <code>telemetry.go</code></div>
          <pre>package main

import (
    "context"
    "time"
    "go.opentelemetry.io/otel"
    otlptracehttp "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    otlpmetrichttp "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func setupTelemetry(ctx context.Context) func() {
    traceExp, _ := otlptracehttp.New(ctx)
    tp := sdktrace.NewTracerProvider(sdktrace.WithBatcher(traceExp))
    otel.SetTracerProvider(tp)

    metricExp, _ := otlpmetrichttp.New(ctx)
    mp := sdkmetric.NewMeterProvider(sdkmetric.WithReader(
        sdkmetric.NewPeriodicReader(metricExp, sdkmetric.WithInterval(15*time.Second)),
    ))
    otel.SetMeterProvider(mp)

    return func() { tp.Shutdown(ctx); mp.Shutdown(ctx) }
}</pre>
          <div class="step-title" style="margin:12px 0 8px">3. Wrap HTTP handler</div>
          <pre>import "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

func main() {
    shutdown := setupTelemetry(context.Background())
    defer shutdown()

    mux := http.NewServeMux()
    mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte(\`{"status":"ok"}\`))
    })
    http.ListenAndServe(":3000", otelhttp.NewHandler(mux, "server"))
}</pre>
        </div>
      </div>
    </section>

    <!-- Deploy to prod -->
    <section>
      <div class="section-title">Deploy to production</div>
      <div class="card">
        <div class="info">Prod deploys are triggered by a version tag push, not pushes to main. This prevents accidental production deployments.</div>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-body">
              <div class="step-title">Verify dev first</div>
              <div class="step-desc">All prod deploys re-tag the image already running on dev. Verify <a href="${DEV_URL}" target="_blank" style="color:var(--primary)">dev</a> before promoting.</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-body">
              <div class="step-title">Push a version tag</div>
              <div class="step-desc">
                Semver tag (e.g. <code>v1.0.0</code>). The platform re-tags the dev image with this version and deploys it to production.
                <pre>git tag v1.0.0 && git push origin v1.0.0</pre>
              </div>
            </div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-body">
              <div class="step-title">Prod is live</div>
              <div class="step-desc">
                Prod URL: <a href="${PROD_URL}" target="_blank" style="color:var(--primary)">${PROD_URL}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Project guide: rendered directly from the root AGENTS.md -->
    <details class="project-guide" id="project-guide" open>
      <summary class="guide-summary">
        <span class="guide-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>
          </svg>
        </span>
        <div class="guide-heading">
          <h2>Project guide</h2>
          <p>From your first clone to production — the complete project instructions.</p>
        </div>
        <span class="guide-badge">AGENTS.md</span>
        ${GUIDE_CHEVRON}
      </summary>
      <div class="guide-content">
        <div class="guide-toolbar">
          <div class="guide-caption">
            <strong>${escapeHtml(GUIDE.title)}</strong>
            <span>${GUIDE.sections.length} sections · Expand a topic to read more</span>
          </div>
          <a class="guide-download" href="/AGENTS.md" download="AGENTS.md">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4"/></svg>
            Download AGENTS.md
          </a>
        </div>
        ${GUIDE.intro ? `<div class="guide-markdown">${GUIDE.intro}</div>` : ''}
        <div class="guide-chapters">
          ${GUIDE.sections.map((section, index) => `<details class="guide-chapter">
            <summary>
              <span class="guide-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
              <h3>${escapeHtml(section.title)}</h3>
              ${GUIDE_CHEVRON}
            </summary>
            <div class="guide-markdown">${section.html}</div>
          </details>`).join('\n')}
        </div>
      </div>
    </details>

  </div>
</div>

<script>
function showCloneProtocol(protocol) {
  if (protocol !== 'https' && protocol !== 'ssh') return;
  document.querySelectorAll('[data-clone-command]').forEach(command => {
    command.textContent = command.dataset[protocol];
  });
  document.querySelectorAll('[data-clone-protocol]').forEach(button => {
    const selected = button.dataset.cloneProtocol === protocol;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
function showRuntime(id) {
  document.querySelectorAll('.runtime').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('rt-' + id).classList.add('active');
  event.target.classList.add('active');
}
function showPath(id) {
  document.querySelectorAll('.deploy-path').forEach(el => el.style.display = 'none');
  document.getElementById('path-' + id).style.display = 'block';
  event.target.closest('.tabs').querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  event.target.classList.add('active');
}
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const requestPath = req.url.split('?', 1)[0];
  const markdown = MARKDOWN_DOCUMENTS.get(requestPath);
  if (markdown !== undefined) {
    res.writeHead(200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${path.posix.basename(requestPath)}"`,
      'Content-Length': Buffer.byteLength(markdown),
      'Cache-Control': 'no-cache',
    });
    res.end(markdown);
    return;
  }
  if (requestPath === '/favicon.svg') {
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Content-Length': FAVICON.length,
      'Cache-Control': 'no-cache',
    });
    res.end(FAVICON);
    return;
  }
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(HTML);
});

server.listen(PORT, () => {
  console.log(JSON.stringify({ level: 'info', message: 'server started', app: SERVICE_NAME, port: PORT, env: ENV }));
});
