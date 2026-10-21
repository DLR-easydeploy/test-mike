const http = require('node:http');

const PORT = Number(process.env.PORT || 3000);

/*
 * Enterprise Services Portfolio V1
 *
 * V1 intentionally runs without external dependencies or persistent storage.
 * Once the EasyDeploy path is proven, the data layer can move to a persistent
 * managed database without changing the portfolio hierarchy.
 */

const portfolio = {
  domains: [
    {
      id: 'employee-platforms',
      name: 'Employee Platforms',
      description:
        'Platforms and services supporting the employee lifecycle, HR technology, workforce data, learning, and employee-facing business capabilities.',
      health: 'yellow',
      maturity: 'Developing',
      direction: 'Improve',
      services: [
        {
          name: 'Core HR Platforms',
          offerings: [
            {
              name: 'Core HR Administration',
              health: 'green',
              maturity: 'Established',
              direction: 'Maintain',
              products: ['Oracle HCM']
            },
            {
              name: 'Employee & Manager Self-Service',
              health: 'yellow',
              maturity: 'Developing',
              direction: 'Improve',
              products: ['Oracle HCM', 'WalkMe']
            }
          ]
        },
        {
          name: 'Talent & Performance',
          offerings: [
            {
              name: 'Performance Management',
              health: 'yellow',
              maturity: 'Developing',
              direction: 'Improve',
              products: ['Oracle HCM']
            },
            {
              name: 'Learning Management',
              health: 'yellow',
              maturity: 'Developing',
              direction: 'Improve',
              products: ['Oracle HCM']
            }
          ]
        },
        {
          name: 'HR Data & Integration',
          offerings: [
            {
              name: 'HR Integrations',
              health: 'yellow',
              maturity: 'Developing',
              direction: 'Invest',
              products: ['Oracle Integration Cloud']
            },
            {
              name: 'HR Reporting & Analytics',
              health: 'yellow',
              maturity: 'Developing',
              direction: 'Improve',
              products: ['Oracle HCM']
            }
          ]
        }
      ]
    },

    {
      id: 'identity-access',
      name: 'Identity & Access',
      description:
        'Identity lifecycle, authentication, authorization, privileged access, and enterprise access governance capabilities.',
      health: 'yellow',
      maturity: 'Developing',
      direction: 'Invest',
      services: [
        {
          name: 'Identity Lifecycle Management',
          offerings: [
            {
              name: 'Identity Provisioning',
              health: 'yellow',
              maturity: 'Developing',
              direction: 'Invest',
              products: ['Microsoft Entra ID']
            },
            {
              name: 'Access Lifecycle Management',
              health: 'yellow',
              maturity: 'Developing',
              direction: 'Improve',
              products: ['Microsoft Entra ID']
            }
          ]
        },
        {
          name: 'Authentication & Access',
          offerings: [
            {
              name: 'Enterprise Authentication',
              health: 'green',
              maturity: 'Established',
              direction: 'Maintain',
              products: ['Microsoft Entra ID']
            },
            {
              name: 'Multi-Factor Authentication',
              health: 'green',
              maturity: 'Established',
              direction: 'Maintain',
              products: ['Microsoft Entra ID']
            }
          ]
        }
      ]
    },

    {
      id: 'end-user-services',
      name: 'End User Services',
      description:
        'Employee workplace technology including endpoint experience, collaboration, productivity, device services, and digital employee experience.',
      health: 'green',
      maturity: 'Established',
      direction: 'Improve',
      services: [
        {
          name: 'Endpoint Services',
          offerings: [
            {
              name: 'Endpoint Management',
              health: 'green',
              maturity: 'Established',
              direction: 'Maintain',
              products: ['Microsoft Intune']
            },
            {
              name: 'Digital Employee Experience',
              health: 'yellow',
              maturity: 'Developing',
              direction: 'Invest',
              products: ['Nexthink']
            }
          ]
        },
        {
          name: 'Collaboration & Productivity',
          offerings: [
            {
              name: 'Collaboration Services',
              health: 'green',
              maturity: 'Established',
              direction: 'Maintain',
              products: ['Microsoft Teams']
            },
            {
              name: 'Productivity Services',
              health: 'green',
              maturity: 'Established',
              direction: 'Maintain',
              products: ['Microsoft 365']
            }
          ]
        }
      ]
    },

    {
      id: 'enterprise-service-management',
      name: 'Enterprise Service Management',
      description:
        'Enterprise service operations, support, service management, configuration, asset management, knowledge, and work management capabilities.',
      health: 'yellow',
      maturity: 'Developing',
      direction: 'Invest',
      services: [
        {
          name: 'IT Service Management',
          offerings: [
            {
              name: 'Incident Management',
              health: 'green',
              maturity: 'Established',
              direction: 'Maintain',
              products: ['ServiceNow']
            },
            {
              name: 'Request Management',
              health: 'yellow',
              maturity: 'Developing',
              direction: 'Improve',
              products: ['ServiceNow']
            },
            {
              name: 'Knowledge Management',
              health: 'yellow',
              maturity: 'Developing',
              direction: 'Improve',
              products: ['ServiceNow']
            }
          ]
        },
        {
          name: 'Technology Portfolio Management',
          offerings: [
            {
              name: 'Software Asset Management',
              health: 'yellow',
              maturity: 'Developing',
              direction: 'Invest',
              products: ['ServiceNow', 'Zylo']
            },
            {
              name: 'Technology Asset Management',
              health: 'yellow',
              maturity: 'Developing',
              direction: 'Improve',
              products: ['ServiceNow']
            },
            {
              name: 'Configuration Management',
              health: 'yellow',
              maturity: 'Developing',
              direction: 'Invest',
              products: ['ServiceNow']
            }
          ]
        }
      ]
    }
  ]
};

function flattenPortfolio() {
  const services = [];
  const offerings = [];
  const products = new Map();

  for (const domain of portfolio.domains) {
    for (const service of domain.services) {
      services.push({
        name: service.name,
        domain: domain.name,
        domainId: domain.id,
        offerings: service.offerings.length
      });

      for (const offering of service.offerings) {
        offerings.push({
          ...offering,
          service: service.name,
          domain: domain.name,
          domainId: domain.id
        });

        for (const productName of offering.products) {
          if (!products.has(productName)) {
            products.set(productName, {
              name: productName,
              offerings: [],
              domains: new Set()
            });
          }

          const product = products.get(productName);
          product.offerings.push(offering.name);
          product.domains.add(domain.name);
        }
      }
    }
  }

  return {
    services,
    offerings,
    products: Array.from(products.values()).map(product => ({
      ...product,
      domains: Array.from(product.domains)
    }))
  };
}

const flattened = flattenPortfolio();

function json(res, statusCode, data) {
  const body = JSON.stringify(data);

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });

  res.end(body);
}

function healthClass(health) {
  return `health-${String(health || '').toLowerCase()}`;
}

function badge(value) {
  const safe = escapeHtml(value);
  return `<span class="badge">${safe}</span>`;
}

function healthBadge(value) {
  return `
    <span class="health-badge ${healthClass(value)}">
      <span class="health-dot"></span>
      ${escapeHtml(capitalize(value))}
    </span>
  `;
}

function capitalize(value) {
  value = String(value || '');
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSummary() {
  const green = flattened.offerings.filter(x => x.health === 'green').length;
  const yellow = flattened.offerings.filter(x => x.health === 'yellow').length;
  const red = flattened.offerings.filter(x => x.health === 'red').length;

  return {
    domains: portfolio.domains.length,
    services: flattened.services.length,
    offerings: flattened.offerings.length,
    products: flattened.products.length,
    green,
    yellow,
    red
  };
}

function renderOverview() {
  const summary = getSummary();

  const domainCards = portfolio.domains.map(domain => {
    const offeringCount = domain.services.reduce(
      (total, service) => total + service.offerings.length,
      0
    );

    return `
      <button class="domain-card" onclick="openDomain('${domain.id}')">
        <div class="domain-top">
          ${healthBadge(domain.health)}
          <span class="arrow">→</span>
        </div>

        <h3>${escapeHtml(domain.name)}</h3>
        <p>${escapeHtml(domain.description)}</p>

        <div class="domain-stats">
          <div>
            <strong>${domain.services.length}</strong>
            <span>Services</span>
          </div>
          <div>
            <strong>${offeringCount}</strong>
            <span>Offerings</span>
          </div>
        </div>

        <div class="domain-meta">
          ${badge(domain.maturity)}
          ${badge(domain.direction)}
        </div>
      </button>
    `;
  }).join('');

  const attention = flattened.offerings
    .filter(x => x.health !== 'green' || ['Invest', 'Improve', 'Consolidate', 'Retire'].includes(x.direction))
    .slice(0, 8)
    .map(offering => `
      <tr>
        <td>
          <button class="text-link" onclick="openDomain('${offering.domainId}')">
            ${escapeHtml(offering.name)}
          </button>
          <div class="subtle">${escapeHtml(offering.service)}</div>
        </td>
        <td>${escapeHtml(offering.domain)}</td>
        <td>${healthBadge(offering.health)}</td>
        <td>${badge(offering.maturity)}</td>
        <td>${badge(offering.direction)}</td>
      </tr>
    `).join('');

  return `
    <section class="hero">
      <div>
        <div class="eyebrow">ENTERPRISE SERVICES PLATFORMS</div>
        <h1>Portfolio Overview</h1>
        <p class="hero-copy">
          A management view of the capabilities we provide, the technology
          enabling them, and where investment or improvement is needed.
        </p>
      </div>
      <div class="as-of">
        <span>V1 Prototype</span>
        <strong>Enterprise Services Portfolio</strong>
      </div>
    </section>

    <section class="metric-grid">
      ${metricCard(summary.domains, 'Domains', 'Capability pillars')}
      ${metricCard(summary.services, 'Services', 'Managed capabilities')}
      ${metricCard(summary.offerings, 'Offerings', 'Consumer outcomes')}
      ${metricCard(summary.products, 'Products & Systems', 'Technology enablers')}
    </section>

    <section>
      <div class="section-heading">
        <div>
          <div class="eyebrow">PORTFOLIO STRUCTURE</div>
          <h2>Domains</h2>
        </div>
      </div>

      <div class="domain-grid">
        ${domainCards}
      </div>
    </section>

    <section class="two-column">
      <div class="panel">
        <div class="section-heading compact">
          <div>
            <div class="eyebrow">PORTFOLIO HEALTH</div>
            <h2>Offering health</h2>
          </div>
        </div>

        <div class="health-summary">
          ${healthSummaryRow('Healthy', summary.green, summary.offerings, 'green')}
          ${healthSummaryRow('Needs attention', summary.yellow, summary.offerings, 'yellow')}
          ${healthSummaryRow('At risk', summary.red, summary.offerings, 'red')}
        </div>

        <div class="health-note">
          Health is assessed at the service offering level so leadership can
          see where the actual business capability requires attention.
        </div>
      </div>

      <div class="panel">
        <div class="section-heading compact">
          <div>
            <div class="eyebrow">HOW IT WORKS</div>
            <h2>Portfolio logic</h2>
          </div>
        </div>

        <div class="flow">
          <div class="flow-node">
            <span>01</span>
            <strong>Domain</strong>
            <small>Strategic capability</small>
          </div>
          <div class="flow-arrow">→</div>
          <div class="flow-node">
            <span>02</span>
            <strong>Service</strong>
            <small>What we manage</small>
          </div>
          <div class="flow-arrow">→</div>
          <div class="flow-node">
            <span>03</span>
            <strong>Offering</strong>
            <small>What users receive</small>
          </div>
          <div class="flow-arrow">→</div>
          <div class="flow-node">
            <span>04</span>
            <strong>Technology</strong>
            <small>What enables it</small>
          </div>
        </div>
      </div>
    </section>

    <section class="panel table-panel">
      <div class="section-heading compact">
        <div>
          <div class="eyebrow">MANAGEMENT ATTENTION</div>
          <h2>Offerings to watch</h2>
        </div>
        <button class="secondary-button" onclick="showPage('offerings')">
          View all offerings
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Offering</th>
              <th>Domain</th>
              <th>Health</th>
              <th>Maturity</th>
              <th>Direction</th>
            </tr>
          </thead>
          <tbody>
            ${attention}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function metricCard(number, label, description) {
  return `
    <div class="metric-card">
      <div class="metric-number">${number}</div>
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-description">${escapeHtml(description)}</div>
    </div>
  `;
}

function healthSummaryRow(label, count, total, color) {
  const percentage = total ? Math.round((count / total) * 100) : 0;

  return `
    <div class="health-row">
      <div class="health-row-label">
        <span class="health-dot health-${color}"></span>
        <span>${escapeHtml(label)}</span>
      </div>
      <div class="health-bar">
        <div class="health-fill health-${color}" style="width:${percentage}%"></div>
      </div>
      <strong>${count}</strong>
    </div>
  `;
}

function renderServices() {
  const rows = flattened.services.map(service => `
    <tr>
      <td>
        <strong>${escapeHtml(service.name)}</strong>
      </td>
      <td>
        <button class="text-link" onclick="openDomain('${service.domainId}')">
          ${escapeHtml(service.domain)}
        </button>
      </td>
      <td>${service.offerings}</td>
      <td>
        <button class="view-button" onclick="openDomain('${service.domainId}')">
          Explore
        </button>
      </td>
    </tr>
  `).join('');

  return renderListPage(
    'Services',
    'The managed capabilities delivered through Enterprise Services Platforms.',
    ['Service', 'Domain', 'Offerings', ''],
    rows
  );
}

function renderOfferings() {
  const rows = flattened.offerings.map(offering => `
    <tr>
      <td>
        <strong>${escapeHtml(offering.name)}</strong>
        <div class="subtle">${escapeHtml(offering.service)}</div>
      </td>
      <td>${escapeHtml(offering.domain)}</td>
      <td>${healthBadge(offering.health)}</td>
      <td>${badge(offering.maturity)}</td>
      <td>${badge(offering.direction)}</td>
      <td>${escapeHtml(offering.products.join(', '))}</td>
    </tr>
  `).join('');

  return renderListPage(
    'Service Offerings',
    'The discrete capabilities and outcomes consumed by employees and business teams.',
    ['Offering', 'Domain', 'Health', 'Maturity', 'Direction', 'Products / Systems'],
    rows
  );
}

function renderProducts() {
  const rows = flattened.products.map(product => `
    <tr>
      <td><strong>${escapeHtml(product.name)}</strong></td>
      <td>${escapeHtml(product.domains.join(', '))}</td>
      <td>${product.offerings.length}</td>
      <td>${escapeHtml(product.offerings.join(', '))}</td>
    </tr>
  `).join('');

  return renderListPage(
    'Products & Systems',
    'The technology platforms and applications enabling portfolio offerings.',
    ['Product / System', 'Domains', 'Offering Count', 'Enabled Offerings'],
    rows
  );
}

function renderAssessments() {
  return `
    <section class="hero">
      <div>
        <div class="eyebrow">PORTFOLIO MANAGEMENT</div>
        <h1>Assessments</h1>
        <p class="hero-copy">
          Capture point-in-time health, maturity, and strategic direction for
          each service offering.
        </p>
      </div>
    </section>

    <section class="assessment-grid">
      <div class="panel assessment-callout">
        <span class="big-number">01</span>
        <h3>Health</h3>
        <p>
          Is the offering delivering the outcome we expect today?
        </p>
        <div class="assessment-options">
          ${healthBadge('green')}
          ${healthBadge('yellow')}
          ${healthBadge('red')}
        </div>
      </div>

      <div class="panel assessment-callout">
        <span class="big-number">02</span>
        <h3>Maturity</h3>
        <p>
          How mature is the capability, operating model, and experience?
        </p>
        <div class="assessment-options">
          ${badge('Emerging')}
          ${badge('Developing')}
          ${badge('Established')}
          ${badge('Leading')}
        </div>
      </div>

      <div class="panel assessment-callout">
        <span class="big-number">03</span>
        <h3>Direction</h3>
        <p>
          What should we do with the capability next?
        </p>
        <div class="assessment-options">
          ${badge('Invest')}
          ${badge('Improve')}
          ${badge('Maintain')}
          ${badge('Consolidate')}
          ${badge('Retire')}
        </div>
      </div>
    </section>

    <section class="panel empty-state">
      <div class="empty-icon">+</div>
      <h2>Assessment workflow comes next</h2>
      <p>
        V1 will preserve assessment history instead of overwriting the latest
        score, allowing health and maturity to be viewed as trends over time.
      </p>
      <span class="prototype-label">Prototype placeholder</span>
    </section>
  `;
}

function renderListPage(title, description, headers, rows) {
  return `
    <section class="hero">
      <div>
        <div class="eyebrow">PORTFOLIO INVENTORY</div>
        <h1>${escapeHtml(title)}</h1>
        <p class="hero-copy">${escapeHtml(description)}</p>
      </div>
    </section>

    <section class="panel table-panel">
      <div class="list-toolbar">
        <div class="search-box">
          <span>⌕</span>
          <input
            type="search"
            placeholder="Filter ${escapeHtml(title.toLowerCase())}..."
            oninput="filterTable(this.value)"
          />
        </div>
        <span class="record-count">${countRows(rows)} records</span>
      </div>

      <div class="table-wrap">
        <table id="portfolio-table">
          <thead>
            <tr>
              ${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function countRows(rows) {
  return (rows.match(/<tr>/g) || []).length;
}

function renderDomainDetails() {
  return portfolio.domains.map(domain => {
    const services = domain.services.map(service => {
      const offerings = service.offerings.map(offering => `
        <div class="offering-card">
          <div class="offering-head">
            <div>
              <div class="eyebrow">SERVICE OFFERING</div>
              <h4>${escapeHtml(offering.name)}</h4>
            </div>
            ${healthBadge(offering.health)}
          </div>

          <div class="offering-meta">
            <div>
              <span>Maturity</span>
              <strong>${escapeHtml(offering.maturity)}</strong>
            </div>
            <div>
              <span>Direction</span>
              <strong>${escapeHtml(offering.direction)}</strong>
            </div>
          </div>

          <div class="product-list">
            <span>Enabled by</span>
            ${offering.products.map(product => badge(product)).join('')}
          </div>
        </div>
      `).join('');

      return `
        <div class="service-section">
          <div class="service-title">
            <div>
              <div class="eyebrow">SERVICE</div>
              <h3>${escapeHtml(service.name)}</h3>
            </div>
            <span>${service.offerings.length} offerings</span>
          </div>

          <div class="offering-grid">
            ${offerings}
          </div>
        </div>
      `;
    }).join('');

    return `
      <section class="domain-detail" id="domain-${domain.id}">
        <button class="back-button" onclick="closeDomain()">← Portfolio Overview</button>

        <div class="domain-hero">
          <div>
            <div class="eyebrow">STRATEGIC DOMAIN</div>
            <h1>${escapeHtml(domain.name)}</h1>
            <p>${escapeHtml(domain.description)}</p>
          </div>

          <div class="domain-scorecard">
            <div>
              <span>Health</span>
              ${healthBadge(domain.health)}
            </div>
            <div>
              <span>Maturity</span>
              <strong>${escapeHtml(domain.maturity)}</strong>
            </div>
            <div>
              <span>Direction</span>
              <strong>${escapeHtml(domain.direction)}</strong>
            </div>
          </div>
        </div>

        ${services}
      </section>
    `;
  }).join('');
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enterprise Services Portfolio</title>

  <style>
    :root {
      --navy: #071d3b;
      --navy-2: #0b2b52;
      --blue: #165dcc;
      --blue-hover: #0d4da9;
      --blue-light: #eaf2ff;

      --bg: #f4f6f9;
      --panel: #ffffff;
      --border: #dfe5ec;

      --text: #10243e;
      --muted: #65758a;

      --green: #198754;
      --green-light: #e8f6ef;

      --yellow: #d89b0d;
      --yellow-light: #fff6dc;

      --red: #c83d4d;
      --red-light: #fcecef;

      --shadow: 0 5px 18px rgba(15, 35, 60, 0.06);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family:
        Inter,
        ui-sans-serif,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    button,
    input {
      font: inherit;
    }

    button {
      cursor: pointer;
    }

    .shell {
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      width: 265px;
      background:
        linear-gradient(180deg, #071d3b 0%, #082542 100%);
      color: white;
      display: flex;
      flex-direction: column;
      z-index: 100;
    }

    .brand {
      padding: 28px 24px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .brand-mark {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;
    }

    .brand-blocks {
      display: grid;
      grid-template-columns: repeat(2, 8px);
      gap: 3px;
    }

    .brand-blocks span {
      width: 8px;
      height: 8px;
      background: #3d84eb;
    }

    .brand-name {
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .product-name {
      color: rgba(255,255,255,.63);
      font-size: 12px;
      line-height: 1.5;
    }

    nav {
      padding: 22px 14px;
      flex: 1;
    }

    .nav-label {
      padding: 0 12px 9px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .12em;
      color: rgba(255,255,255,.38);
    }

    .nav-button {
      appearance: none;
      width: 100%;
      border: 0;
      background: transparent;
      color: rgba(255,255,255,.72);
      padding: 11px 12px;
      border-radius: 7px;
      text-align: left;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 11px;
    }

    .nav-button:hover {
      background: rgba(255,255,255,.07);
      color: white;
    }

    .nav-button.active {
      background: #165dcc;
      color: white;
    }

    .nav-icon {
      display: inline-grid;
      place-items: center;
      width: 22px;
      font-size: 16px;
    }

    .sidebar-footer {
      padding: 20px 24px;
      border-top: 1px solid rgba(255,255,255,.1);
      font-size: 11px;
      color: rgba(255,255,255,.45);
    }

    .content-shell {
      width: calc(100% - 265px);
      margin-left: 265px;
    }

    .topbar {
      min-height: 66px;
      padding: 0 36px;
      background: white;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .topbar-title {
      font-size: 13px;
      color: var(--muted);
    }

    .environment {
      background: #e9f7ef;
      color: #18794e;
      border: 1px solid #bfe6d0;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 10px;
    }

    main {
      max-width: 1600px;
      margin: 0 auto;
      padding: 44px 42px 80px;
    }

    .eyebrow {
      color: var(--blue);
      font-size: 10px;
      letter-spacing: .14em;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .hero {
      display: flex;
      justify-content: space-between;
      gap: 30px;
      align-items: flex-start;
      margin-bottom: 34px;
    }

    h1,
    h2,
    h3,
    h4,
    p {
      margin-top: 0;
    }

    h1 {
      margin-bottom: 9px;
      font-size: 33px;
      letter-spacing: -.035em;
    }

    h2 {
      margin-bottom: 0;
      font-size: 21px;
      letter-spacing: -.02em;
    }

    h3 {
      letter-spacing: -.015em;
    }

    .hero-copy {
      max-width: 720px;
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.65;
    }

    .as-of {
      padding: 13px 16px;
      border: 1px solid var(--border);
      background: white;
      border-radius: 8px;
      font-size: 11px;
    }

    .as-of span,
    .as-of strong {
      display: block;
    }

    .as-of span {
      color: var(--muted);
      margin-bottom: 3px;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 42px;
    }

    .metric-card,
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
    }

    .metric-card {
      padding: 20px;
      border-radius: 8px;
    }

    .metric-number {
      font-size: 31px;
      font-weight: 750;
      line-height: 1.1;
    }

    .metric-label {
      font-size: 13px;
      font-weight: 700;
      margin-top: 8px;
    }

    .metric-description {
      color: var(--muted);
      font-size: 11px;
      margin-top: 3px;
    }

    .section-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 17px;
    }

    .section-heading.compact {
      margin-bottom: 24px;
    }

    section + section {
      margin-top: 38px;
    }

    .domain-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }

    .domain-card {
      border: 1px solid var(--border);
      border-top: 3px solid var(--blue);
      border-radius: 8px;
      background: white;
      padding: 20px;
      text-align: left;
      color: inherit;
      box-shadow: var(--shadow);
      transition: transform .15s ease, box-shadow .15s ease;
    }

    .domain-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 9px 24px rgba(15,35,60,.09);
    }

    .domain-card h3 {
      font-size: 17px;
      margin: 19px 0 8px;
    }

    .domain-card p {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.55;
      min-height: 75px;
    }

    .domain-top {
      display: flex;
      justify-content: space-between;
    }

    .arrow {
      color: var(--blue);
      font-size: 19px;
    }

    .domain-stats {
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      margin: 18px 0;
      padding: 13px 0;
      display: flex;
      gap: 34px;
    }

    .domain-stats strong,
    .domain-stats span {
      display: block;
    }

    .domain-stats strong {
      font-size: 18px;
    }

    .domain-stats span {
      color: var(--muted);
      font-size: 10px;
      margin-top: 2px;
    }

    .domain-meta,
    .assessment-options {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 4px;
      background: #eef2f7;
      color: #425570;
      font-size: 10px;
      font-weight: 700;
      padding: 4px 7px;
    }

    .health-badge {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 750;
      border-radius: 20px;
      padding: 4px 8px;
    }

    .health-badge.health-green {
      background: var(--green-light);
      color: var(--green);
    }

    .health-badge.health-yellow {
      background: var(--yellow-light);
      color: #956600;
    }

    .health-badge.health-red {
      background: var(--red-light);
      color: var(--red);
    }

    .health-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
    }

    .health-dot.health-green,
    .health-badge.health-green .health-dot,
    .health-fill.health-green {
      background: var(--green);
    }

    .health-dot.health-yellow,
    .health-badge.health-yellow .health-dot,
    .health-fill.health-yellow {
      background: var(--yellow);
    }

    .health-dot.health-red,
    .health-badge.health-red .health-dot,
    .health-fill.health-red {
      background: var(--red);
    }

    .two-column {
      display: grid;
      grid-template-columns: .85fr 1.15fr;
      gap: 16px;
    }

    .panel {
      border-radius: 8px;
      padding: 25px;
    }

    .health-row {
      display: grid;
      grid-template-columns: 125px 1fr 26px;
      gap: 14px;
      align-items: center;
      margin-bottom: 16px;
      font-size: 11px;
    }

    .health-row-label {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .health-bar {
      height: 7px;
      background: #eef1f5;
      border-radius: 5px;
      overflow: hidden;
    }

    .health-fill {
      height: 100%;
      border-radius: 5px;
    }

    .health-note {
      padding-top: 15px;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 11px;
      line-height: 1.5;
    }

    .flow {
      display: flex;
      align-items: stretch;
    }

    .flow-node {
      flex: 1;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 14px 11px;
    }

    .flow-node span,
    .flow-node strong,
    .flow-node small {
      display: block;
    }

    .flow-node span {
      color: var(--blue);
      font-size: 9px;
      margin-bottom: 7px;
      font-weight: 800;
    }

    .flow-node strong {
      font-size: 12px;
    }

    .flow-node small {
      color: var(--muted);
      font-size: 9px;
      margin-top: 4px;
    }

    .flow-arrow {
      display: grid;
      place-items: center;
      color: #8da0b4;
      padding: 0 6px;
    }

    .table-panel {
      padding: 0;
      overflow: hidden;
    }

    .table-panel > .section-heading {
      padding: 25px 25px 0;
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    th {
      color: var(--muted);
      font-size: 9px;
      letter-spacing: .08em;
      text-transform: uppercase;
      text-align: left;
      background: #f8fafc;
      padding: 10px 16px;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 14px 16px;
      border-bottom: 1px solid #edf0f4;
      vertical-align: middle;
    }

    tbody tr:hover {
      background: #fbfcfe;
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }

    .subtle {
      color: var(--muted);
      font-size: 10px;
      margin-top: 3px;
    }

    .text-link {
      background: none;
      border: 0;
      color: var(--blue);
      padding: 0;
      text-align: left;
      font-weight: 700;
    }

    .secondary-button,
    .view-button,
    .back-button {
      border: 1px solid var(--border);
      background: white;
      color: var(--text);
      border-radius: 6px;
      padding: 7px 11px;
      font-size: 11px;
      font-weight: 650;
    }

    .secondary-button:hover,
    .view-button:hover,
    .back-button:hover {
      border-color: var(--blue);
      color: var(--blue);
    }

    .list-toolbar {
      padding: 20px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      width: min(420px, 70%);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0 11px;
      background: #fbfcfd;
    }

    .search-box input {
      border: 0;
      outline: 0;
      background: transparent;
      padding: 9px 0;
      width: 100%;
      color: var(--text);
    }

    .record-count {
      color: var(--muted);
      font-size: 11px;
    }

    .assessment-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }

    .assessment-callout {
      min-height: 220px;
    }

    .big-number {
      display: block;
      color: var(--blue);
      font-size: 11px;
      font-weight: 800;
      margin-bottom: 26px;
    }

    .assessment-callout h3 {
      margin-bottom: 7px;
    }

    .assessment-callout p {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.55;
      min-height: 52px;
    }

    .empty-state {
      text-align: center;
      padding: 52px 30px;
    }

    .empty-state p {
      max-width: 620px;
      margin: 10px auto 20px;
      color: var(--muted);
      line-height: 1.6;
      font-size: 13px;
    }

    .empty-icon {
      margin: 0 auto 17px;
      width: 42px;
      height: 42px;
      border: 1px dashed var(--blue);
      display: grid;
      place-items: center;
      color: var(--blue);
      border-radius: 50%;
      font-size: 23px;
    }

    .prototype-label {
      color: var(--blue);
      background: var(--blue-light);
      border-radius: 20px;
      padding: 5px 10px;
      font-size: 10px;
      font-weight: 700;
    }

    .domain-detail {
      display: none;
    }

    .domain-detail.active {
      display: block;
    }

    .back-button {
      margin-bottom: 26px;
    }

    .domain-hero {
      background: var(--navy);
      color: white;
      padding: 30px;
      border-radius: 9px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 45px;
      margin-bottom: 36px;
    }

    .domain-hero .eyebrow {
      color: #6fa5f4;
    }

    .domain-hero h1 {
      margin-bottom: 10px;
    }

    .domain-hero p {
      max-width: 740px;
      margin-bottom: 0;
      color: rgba(255,255,255,.68);
      font-size: 13px;
      line-height: 1.6;
    }

    .domain-scorecard {
      display: flex;
      gap: 30px;
      align-items: center;
    }

    .domain-scorecard > div > span:first-child {
      display: block;
      color: rgba(255,255,255,.5);
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 6px;
    }

    .domain-scorecard strong {
      font-size: 12px;
    }

    .service-section {
      margin-top: 34px;
    }

    .service-title {
      display: flex;
      justify-content: space-between;
      align-items: end;
      margin-bottom: 14px;
    }

    .service-title h3 {
      margin: 0;
    }

    .service-title > span {
      color: var(--muted);
      font-size: 11px;
    }

    .offering-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 13px;
    }

    .offering-card {
      background: white;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 18px;
      box-shadow: var(--shadow);
    }

    .offering-head {
      display: flex;
      gap: 15px;
      justify-content: space-between;
      align-items: flex-start;
    }

    .offering-head h4 {
      margin-bottom: 0;
      font-size: 14px;
    }

    .offering-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      margin: 20px 0;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }

    .offering-meta > div {
      padding: 11px 0;
    }

    .offering-meta > div + div {
      border-left: 1px solid var(--border);
      padding-left: 14px;
    }

    .offering-meta span,
    .offering-meta strong {
      display: block;
    }

    .offering-meta span,
    .product-list > span:first-child {
      color: var(--muted);
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: .06em;
    }

    .offering-meta strong {
      margin-top: 4px;
      font-size: 11px;
    }

    .product-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
    }

    .product-list > span:first-child {
      margin-right: 4px;
    }

    #page-root.hidden {
      display: none;
    }

    @media (max-width: 1150px) {
      .domain-grid,
      .metric-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .offering-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .two-column {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 780px) {
      .sidebar {
        position: static;
        width: 100%;
      }

      .shell {
        display: block;
      }

      nav {
        display: flex;
        overflow-x: auto;
        padding: 10px;
      }

      .nav-label,
      .sidebar-footer {
        display: none;
      }

      .nav-button {
        width: auto;
        white-space: nowrap;
      }

      .content-shell {
        margin-left: 0;
        width: 100%;
      }

      .topbar {
        padding: 0 20px;
      }

      main {
        padding: 28px 18px 60px;
      }

      .metric-grid,
      .domain-grid,
      .assessment-grid,
      .offering-grid {
        grid-template-columns: 1fr;
      }

      .hero,
      .domain-hero {
        display: block;
      }

      .as-of,
      .domain-scorecard {
        margin-top: 22px;
      }

      .domain-scorecard {
        flex-wrap: wrap;
      }
    }
  </style>
</head>

<body>

<div class="shell">

  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark">
        <div class="brand-blocks">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="brand-name">DLR</div>
      </div>
      <div class="product-name">
        Enterprise Services<br>
        Portfolio
      </div>
    </div>

    <nav>
      <div class="nav-label">PORTFOLIO</div>

      <button class="nav-button active" data-page="overview" onclick="showPage('overview')">
        <span class="nav-icon">⌂</span>
        Overview
      </button>

      <button class="nav-button" data-page="services" onclick="showPage('services')">
        <span class="nav-icon">▦</span>
        Services
      </button>

      <button class="nav-button" data-page="offerings" onclick="showPage('offerings')">
        <span class="nav-icon">◫</span>
        Service Offerings
      </button>

      <button class="nav-button" data-page="products" onclick="showPage('products')">
        <span class="nav-icon">◇</span>
        Products & Systems
      </button>

      <button class="nav-button" data-page="assessments" onclick="showPage('assessments')">
        <span class="nav-icon">◉</span>
        Assessments
      </button>
    </nav>

    <div class="sidebar-footer">
      Enterprise Services Platforms<br>
      V1 Prototype
    </div>
  </aside>

  <div class="content-shell">

    <header class="topbar">
      <div class="topbar-title">
        Portfolio Management
      </div>

      <div class="environment">
        DEV
      </div>
    </header>

    <main>
      <div id="page-root"></div>
      <div id="domain-root">
        ${renderDomainDetails()}
      </div>
    </main>

  </div>
</div>

<script>
  const pages = {
    overview: ${JSON.stringify(renderOverview())},
    services: ${JSON.stringify(renderServices())},
    offerings: ${JSON.stringify(renderOfferings())},
    products: ${JSON.stringify(renderProducts())},
    assessments: ${JSON.stringify(renderAssessments())}
  };

  const pageRoot = document.getElementById('page-root');

  function showPage(pageName) {
    closeDomain(false);

    pageRoot.innerHTML = pages[pageName] || pages.overview;
    pageRoot.classList.remove('hidden');

    document.querySelectorAll('.nav-button').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.page === pageName
      );
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openDomain(domainId) {
    pageRoot.classList.add('hidden');

    document.querySelectorAll('.domain-detail').forEach(domain => {
      domain.classList.remove('active');
    });

    const domain = document.getElementById('domain-' + domainId);

    if (domain) {
      domain.classList.add('active');
    }

    document.querySelectorAll('.nav-button').forEach(button => {
      button.classList.remove('active');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeDomain(returnToOverview = true) {
    document.querySelectorAll('.domain-detail').forEach(domain => {
      domain.classList.remove('active');
    });

    if (returnToOverview) {
      showPage('overview');
    }
  }

  function filterTable(value) {
    const query = value.trim().toLowerCase();

    document.querySelectorAll('#portfolio-table tbody tr').forEach(row => {
      row.style.display =
        row.textContent.toLowerCase().includes(query)
          ? ''
          : 'none';
    });
  }

  showPage('overview');
</script>

</body>
</html>`;

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (pathname === '/healthz') {
    return json(res, 200, {
      status: 'ok',
      service: 'enterprise-services-portfolio'
    });
  }

  if (pathname === '/api/portfolio') {
    return json(res, 200, portfolio);
  }

  if (pathname === '/api/summary') {
    return json(res, 200, getSummary());
  }

  if (pathname === '/') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });

    res.end(HTML);
    return;
  }

  json(res, 404, {
    error: 'Not found'
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({
    level: 'info',
    message: 'Enterprise Services Portfolio started',
    service: process.env.OTEL_SERVICE_NAME || 'test-mike',
    port: PORT
  }));
});