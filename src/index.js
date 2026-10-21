const http = require('node:http');
const { portfolio, validation } = require('./data/portfolio');

const PORT = Number(process.env.PORT || 3000);
const SERVICE_NAME =
  process.env.OTEL_SERVICE_NAME || 'test-mike';

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });

  res.end(body);
}

function getLatestAssessments() {
  const latest = new Map();

  for (const assessment of portfolio.assessments) {
    if (assessment.entityType !== 'offering') {
      continue;
    }

    const current = latest.get(assessment.entityId);

    if (
      !current ||
      String(assessment.assessmentDate) >
        String(current.assessmentDate)
    ) {
      latest.set(assessment.entityId, assessment);
    }
  }

  return latest;
}

function buildViewModel() {
  const domainById = new Map(
    portfolio.domains.map(domain => [
      domain.id,
      domain
    ])
  );

  const serviceById = new Map(
    portfolio.services.map(service => [
      service.id,
      service
    ])
  );

  const offeringById = new Map(
    portfolio.offerings.map(offering => [
      offering.id,
      offering
    ])
  );

  const productById = new Map(
    portfolio.products.map(product => [
      product.id,
      product
    ])
  );

  const latestAssessmentByOffering =
    getLatestAssessments();

  const relationshipsByOffering = new Map();
  const relationshipsByProduct = new Map();

  for (const relationship of portfolio.relationships) {
    if (
      !relationshipsByOffering.has(
        relationship.offeringId
      )
    ) {
      relationshipsByOffering.set(
        relationship.offeringId,
        []
      );
    }

    if (
      !relationshipsByProduct.has(
        relationship.productId
      )
    ) {
      relationshipsByProduct.set(
        relationship.productId,
        []
      );
    }

    relationshipsByOffering
      .get(relationship.offeringId)
      .push(relationship);

    relationshipsByProduct
      .get(relationship.productId)
      .push(relationship);
  }

  const offerings = portfolio.offerings.map(
    offering => {
      const service = serviceById.get(
        offering.serviceId
      );

      const domain = service
        ? domainById.get(service.domainId)
        : null;

      const assessment =
        latestAssessmentByOffering.get(
          offering.id
        ) || null;

      const relationships =
        relationshipsByOffering.get(
          offering.id
        ) || [];

      const products = relationships
        .map(relationship => {
          const product = productById.get(
            relationship.productId
          );

          if (!product) {
            return null;
          }

          return {
            ...product,
            relationship
          };
        })
        .filter(Boolean);

      return {
        ...offering,
        serviceName:
          service?.name || 'Unknown Service',
        domainId: domain?.id || '',
        domainName:
          domain?.name || 'Unknown Domain',
        assessment,
        products
      };
    }
  );

  const services = portfolio.services.map(
    service => {
      const domain = domainById.get(
        service.domainId
      );

      const serviceOfferings = offerings.filter(
        offering =>
          offering.serviceId === service.id
      );

      return {
        ...service,
        domainName:
          domain?.name || 'Unknown Domain',
        offeringCount:
          serviceOfferings.length,
        offerings: serviceOfferings
      };
    }
  );

  const domains = portfolio.domains.map(
    domain => {
      const domainServices = services.filter(
        service =>
          service.domainId === domain.id
      );

      const domainOfferings =
        domainServices.flatMap(
          service => service.offerings
        );

      return {
        ...domain,
        serviceCount: domainServices.length,
        offeringCount:
          domainOfferings.length,
        services: domainServices
      };
    }
  );

  const products = portfolio.products.map(
    product => {
      const relationships =
        relationshipsByProduct.get(
          product.id
        ) || [];

      const linkedOfferings = relationships
        .map(relationship => {
          const offering = offeringById.get(
            relationship.offeringId
          );

          if (!offering) {
            return null;
          }

          const service = serviceById.get(
            offering.serviceId
          );

          const domain = service
            ? domainById.get(service.domainId)
            : null;

          return {
            ...offering,
            serviceName:
              service?.name || 'Unknown Service',
            domainName:
              domain?.name || 'Unknown Domain',
            relationship
          };
        })
        .filter(Boolean);

      return {
        ...product,
        relationships,
        offerings: linkedOfferings
      };
    }
  );

  const coverage = {
    total: offerings.length,

    validated: offerings.filter(
      offering =>
        offering.assessment &&
        !offering.assessment.syntheticDemo &&
        offering.assessment.status ===
          'Validated'
    ).length,

    synthetic: offerings.filter(
      offering =>
        offering.assessment?.syntheticDemo
    ).length,

    missing: offerings.filter(
      offering => !offering.assessment
    ).length,

    needsReview: offerings.filter(
      offering =>
        offering.validationStatus ===
        'Needs Review'
    ).length
  };

  return {
    metadata: portfolio.metadata,
    domains,
    services,
    offerings,
    products,
    relationships:
      portfolio.relationships,
    assessments: portfolio.assessments,
    actions: portfolio.actions || [],
    coverage,
    validation
  };
}

const HTML = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>
    Enterprise Services Portfolio
  </title>

  <style>
    :root {
      --navy: #071d3b;
      --navy-light: #0b2b52;
      --blue: #1456e0;
      --blue-dark: #0d47b5;
      --blue-light: #e9f1ff;

      --background: #f4f7fb;
      --panel: #ffffff;
      --border: #dce4ee;

      --text: #10243e;
      --muted: #68788c;

      --green: #188657;
      --green-light: #e8f6ef;

      --yellow: #a96f00;
      --yellow-light: #fff3cf;

      --red: #c33d4d;
      --red-light: #fcebed;

      --purple: #7147c7;
      --purple-light: #f0eafd;

      --shadow:
        0 6px 22px rgba(13, 35, 64, 0.07);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--background);
      color: var(--text);
      font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    button,
    input,
    select {
      font: inherit;
    }

    button {
      cursor: pointer;
    }

    .app {
      min-height: 100vh;
    }

    .sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      width: 270px;
      background:
        linear-gradient(
          180deg,
          var(--navy),
          #082742
        );
      color: white;
      display: flex;
      flex-direction: column;
      z-index: 10;
    }

    .brand {
      padding: 28px 24px 23px;
      border-bottom:
        1px solid rgba(255, 255, 255, 0.1);
    }

    .brand-line {
      display: flex;
      gap: 11px;
      align-items: center;
      font-weight: 800;
      letter-spacing: 0.06em;
    }

    .brand-mark {
      display: grid;
      grid-template-columns:
        repeat(2, 8px);
      gap: 3px;
    }

    .brand-mark span {
      width: 8px;
      height: 8px;
      background: #4b8df0;
    }

    .product-name {
      margin-top: 16px;
      color: rgba(255, 255, 255, 0.66);
      font-size: 12px;
      line-height: 1.5;
    }

    .navigation {
      padding: 20px 13px;
      flex: 1;
    }

    .navigation-label {
      padding: 0 12px 8px;
      color: rgba(255, 255, 255, 0.38);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
    }

    .navigation button {
      width: 100%;
      border: 0;
      background: transparent;
      color: rgba(255, 255, 255, 0.72);
      text-align: left;
      padding: 11px 12px;
      border-radius: 7px;
      margin: 2px 0;
      display: flex;
      gap: 10px;
    }

    .navigation button:hover,
    .navigation button.active {
      background: var(--blue);
      color: white;
    }

    .sidebar-footer {
      padding: 19px 24px;
      border-top:
        1px solid rgba(255, 255, 255, 0.1);
      font-size: 11px;
      color: rgba(255, 255, 255, 0.48);
    }

    .main {
      margin-left: 270px;
    }

    .topbar {
      height: 66px;
      background: white;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 35px;
      position: sticky;
      top: 0;
      z-index: 5;
    }

    .breadcrumb {
      font-size: 12px;
      color: var(--muted);
    }

    .environment {
      font-size: 10px;
      font-weight: 800;
      color: var(--green);
      background: var(--green-light);
      border-radius: 20px;
      padding: 5px 10px;
    }

    .content {
      max-width: 1600px;
      margin: auto;
      padding: 40px 40px 80px;
    }

    .eyebrow {
      font-size: 10px;
      letter-spacing: 0.13em;
      font-weight: 850;
      color: var(--blue);
      margin-bottom: 7px;
    }

    .hero {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 30px;
    }

    .hero h1 {
      margin: 0 0 8px;
      font-size: 32px;
      letter-spacing: -0.035em;
    }

    .hero p {
      margin: 0;
      color: var(--muted);
      max-width: 780px;
      line-height: 1.6;
      font-size: 13px;
    }

    .notice {
      background: var(--yellow-light);
      color: #795400;
      border: 1px solid #efd78c;
      padding: 10px 13px;
      border-radius: 7px;
      font-size: 11px;
      max-width: 340px;
    }

    .metrics {
      display: grid;
      grid-template-columns:
        repeat(5, 1fr);
      gap: 13px;
      margin-bottom: 34px;
    }

    .card,
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      border-radius: 9px;
    }

    .metric {
      padding: 19px;
    }

    .metric strong {
      display: block;
      font-size: 28px;
      overflow-wrap: anywhere;
    }

    .metric span {
      display: block;
      font-size: 12px;
      font-weight: 750;
      margin-top: 7px;
    }

    .metric small {
      color: var(--muted);
      font-size: 10px;
    }

    .section-heading {
      display: flex;
      align-items: end;
      justify-content: space-between;
      margin: 30px 0 14px;
    }

    .section-heading h2 {
      margin: 0;
      font-size: 20px;
    }

    .domain-grid {
      display: grid;
      grid-template-columns:
        repeat(4, 1fr);
      gap: 13px;
    }

    .domain-card {
      padding: 19px;
      border-top:
        3px solid var(--blue);
      text-align: left;
      color: inherit;
    }

    .domain-card:hover {
      transform: translateY(-2px);
    }

    .domain-card h3 {
      font-size: 16px;
      margin: 15px 0 7px;
    }

    .domain-card p {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.55;
      min-height: 70px;
    }

    .counts {
      display: flex;
      gap: 26px;
      padding: 12px 0;
      border-top: 1px solid var(--border);
      border-bottom:
        1px solid var(--border);
    }

    .counts strong,
    .counts small {
      display: block;
    }

    .counts small {
      font-size: 9px;
      color: var(--muted);
    }

    .tag-list {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      margin-top: 13px;
    }

    .tag {
      display: inline-flex;
      padding: 4px 7px;
      border-radius: 4px;
      background: #edf2f7;
      color: #475b73;
      font-size: 9px;
      font-weight: 750;
    }

    .badge {
      display: inline-flex;
      gap: 5px;
      align-items: center;
      padding: 4px 8px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: 800;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .green {
      background: var(--green-light);
      color: var(--green);
    }

    .green .dot {
      background: var(--green);
    }

    .yellow {
      background: var(--yellow-light);
      color: var(--yellow);
    }

    .yellow .dot {
      background: #d99a12;
    }

    .red {
      background: var(--red-light);
      color: var(--red);
    }

    .red .dot {
      background: var(--red);
    }

    .unknown {
      background: #edf2f7;
      color: #65758a;
    }

    .unknown .dot {
      background: #8090a3;
    }

    .synthetic {
      background: var(--purple-light);
      color: var(--purple);
      margin-right: 4px;
    }

    .coverage-grid {
      display: grid;
      grid-template-columns:
        repeat(4, 1fr);
      gap: 12px;
    }

    .coverage-card {
      padding: 18px;
    }

    .coverage-card strong {
      display: block;
      font-size: 25px;
    }

    .coverage-card span {
      font-size: 10px;
      color: var(--muted);
    }

    .toolbar {
      padding: 17px 20px;
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
    }

    .filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .search,
    select {
      border: 1px solid var(--border);
      background: #fbfcfe;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 11px;
      color: var(--text);
    }

    .search {
      min-width: 300px;
    }

    .visible-count {
      font-size: 10px;
      color: var(--muted);
    }

    .table-panel {
      overflow: hidden;
    }

    .table-wrap {
      overflow: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    th {
      text-align: left;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 9px;
      color: var(--muted);
      background: #f8fafc;
      padding: 10px 14px;
      border-top: 1px solid var(--border);
      border-bottom:
        1px solid var(--border);
    }

    td {
      padding: 13px 14px;
      border-bottom:
        1px solid #edf1f5;
      vertical-align: top;
    }

    tr:hover td {
      background: #fbfcfe;
    }

    .link-button {
      border: 0;
      background: transparent;
      color: var(--blue);
      font-weight: 750;
      padding: 0;
      text-align: left;
    }

    .secondary-text {
      font-size: 9px;
      color: var(--muted);
      margin-top: 3px;
      line-height: 1.4;
    }

    .two-column {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 13px;
    }

    .quality-panel {
      padding: 20px;
    }

    .quality-panel h2 {
      margin: 0 0 10px;
      font-size: 18px;
    }

    .quality-panel ul {
      margin: 8px 0 0;
      padding-left: 19px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.7;
    }

    .chart-row {
      display: grid;
      grid-template-columns:
        120px 1fr 28px;
      gap: 10px;
      align-items: center;
      margin: 12px 0;
      font-size: 10px;
    }

    .bar {
      height: 8px;
      background: #edf1f5;
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: var(--blue);
    }

    .detail-navigation {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 20px;
    }

    .back-button {
      border: 1px solid var(--border);
      background: white;
      border-radius: 6px;
      padding: 7px 10px;
      font-size: 10px;
    }

    .detail-hero {
      background: var(--navy);
      color: white;
      padding: 27px;
      border-radius: 10px;
      display: grid;
      grid-template-columns:
        1fr auto;
      gap: 30px;
    }

    .detail-hero h1 {
      margin: 0 0 8px;
      font-size: 28px;
    }

    .detail-hero p {
      margin: 0;
      color: rgba(255, 255, 255, 0.67);
      font-size: 12px;
      line-height: 1.6;
    }

    .detail-scorecard {
      display: flex;
      gap: 24px;
      align-items: center;
    }

    .detail-scorecard label {
      display: block;
      font-size: 8px;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 5px;
    }

    .service-section {
      margin-top: 29px;
    }

    .service-title {
      display: flex;
      justify-content: space-between;
      align-items: end;
      margin-bottom: 11px;
    }

    .service-title h3 {
      margin: 0;
    }

    .offering-grid {
      display: grid;
      grid-template-columns:
        repeat(3, 1fr);
      gap: 12px;
    }

    .offering-card {
      padding: 16px;
    }

    .offering-card h4 {
      margin: 9px 0 12px;
      font-size: 13px;
    }

    .assessment-meta {
      display: grid;
      grid-template-columns:
        repeat(3, 1fr);
      border-top: 1px solid var(--border);
      border-bottom:
        1px solid var(--border);
      margin: 13px 0;
    }

    .assessment-meta div {
      padding: 9px 5px;
    }

    .assessment-meta div + div {
      border-left:
        1px solid var(--border);
    }

    .assessment-meta label {
      font-size: 8px;
      text-transform: uppercase;
      color: var(--muted);
      display: block;
    }

    .assessment-meta strong {
      font-size: 10px;
      display: block;
      margin-top: 4px;
    }

    .product-chip {
      display: inline-flex;
      background: #eef3f8;
      padding: 4px 7px;
      border-radius: 4px;
      font-size: 9px;
      margin: 3px 3px 0 0;
    }

    .summary {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.6;
    }

    .loading,
    .error {
      padding: 50px;
      text-align: center;
      color: var(--muted);
    }

    .hidden {
      display: none;
    }

    @media (max-width: 1150px) {
      .metrics {
        grid-template-columns:
          repeat(3, 1fr);
      }

      .domain-grid,
      .offering-grid {
        grid-template-columns:
          repeat(2, 1fr);
      }
    }

    @media (max-width: 760px) {
      .sidebar {
        position: static;
        width: 100%;
      }

      .navigation {
        display: flex;
        overflow: auto;
      }

      .navigation-label,
      .sidebar-footer {
        display: none;
      }

      .navigation button {
        width: auto;
        white-space: nowrap;
      }

      .main {
        margin-left: 0;
      }

      .topbar {
        padding: 0 18px;
      }

      .content {
        padding: 25px 17px 55px;
      }

      .metrics,
      .domain-grid,
      .offering-grid,
      .coverage-grid,
      .two-column {
        grid-template-columns: 1fr;
      }

      .hero,
      .detail-hero {
        display: block;
      }

      .notice,
      .detail-scorecard {
        margin-top: 18px;
      }

      .toolbar {
        align-items: flex-start;
        flex-direction: column;
      }

      .search {
        min-width: 180px;
      }
    }
  </style>
</head>

<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-line">
          <span class="brand-mark">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>

          DLR
        </div>

        <div class="product-name">
          Enterprise Services<br>
          Portfolio
        </div>
      </div>

      <nav class="navigation">
        <div class="navigation-label">
          MANAGE
        </div>

        <button
          data-page="overview"
          onclick="showPage('overview')"
        >
          ⌂ Overview
        </button>

        <button
          data-page="health"
          onclick="showPage('health')"
        >
          ◉ Portfolio Health
        </button>

        <button
          data-page="services"
          onclick="showPage('services')"
        >
          ▦ Services
        </button>

        <button
          data-page="offerings"
          onclick="showPage('offerings')"
        >
          ◫ Service Offerings
        </button>

        <button
          data-page="products"
          onclick="showPage('products')"
        >
          ◇ Products & Systems
        </button>

        <button
          data-page="relationships"
          onclick="showPage('relationships')"
        >
          ⇄ Offering–Product Map
        </button>

        <button
          data-page="assessments"
          onclick="showPage('assessments')"
        >
          ✓ Assessments
        </button>

        <button
          data-page="quality"
          onclick="showPage('quality')"
        >
          ⚑ Data Quality
        </button>
      </nav>

      <div class="sidebar-footer">
        Enterprise Services Platforms<br>
        V1 Prototype
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div
          class="breadcrumb"
          id="breadcrumb"
        >
          Portfolio Management
        </div>

        <div class="environment">
          DEV
        </div>
      </header>

      <main
        class="content"
        id="content"
      >
        <div class="loading">
          Loading portfolio...
        </div>
      </main>
    </div>
  </div>

  <script>
    let viewModel = null;

    function escapeHtml(value) {
      return String(value ?? '')
        .replace(
          /[&<>"']/g,
          character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
          })[character]
        );
    }

    function renderTag(value) {
      return (
        '<span class="tag">' +
        escapeHtml(value || 'Unknown') +
        '</span>'
      );
    }

    function renderHealth(value) {
      const normalized =
        String(value || 'unknown').toLowerCase();

      const label = value
        ? String(value)
            .charAt(0)
            .toUpperCase() +
          String(value).slice(1)
        : 'Unknown';

      return (
        '<span class="badge ' +
        escapeHtml(normalized) +
        '">' +
        '<span class="dot"></span>' +
        escapeHtml(label) +
        '</span>'
      );
    }

    function renderSynthetic(assessment) {
      if (!assessment?.syntheticDemo) {
        return '';
      }

      return (
        '<span class="badge synthetic">' +
        'Synthetic demo' +
        '</span>'
      );
    }

    function getAssessment(offering) {
      return offering.assessment || {};
    }

    function renderHero(
      eyebrow,
      title,
      description,
      notice = ''
    ) {
      return (
        '<section class="hero">' +
          '<div>' +
            '<div class="eyebrow">' +
              escapeHtml(eyebrow) +
            '</div>' +

            '<h1>' +
              escapeHtml(title) +
            '</h1>' +

            '<p>' +
              escapeHtml(description) +
            '</p>' +
          '</div>' +

          (
            notice
              ? (
                '<div class="notice">' +
                  escapeHtml(notice) +
                '</div>'
              )
              : ''
          ) +
        '</section>'
      );
    }

    function renderMetric(
      value,
      label,
      description
    ) {
      return (
        '<div class="card metric">' +
          '<strong>' +
            escapeHtml(value) +
          '</strong>' +

          '<span>' +
            escapeHtml(label) +
          '</span>' +

          '<small>' +
            escapeHtml(description) +
          '</small>' +
        '</div>'
      );
    }

    function renderTable(headers, rows) {
      return (
        '<section class="panel table-panel">' +
          '<div class="table-wrap">' +
            '<table>' +
              '<thead>' +
                '<tr>' +
                  headers
                    .map(
                      header =>
                        '<th>' +
                          escapeHtml(header) +
                        '</th>'
                    )
                    .join('') +
                '</tr>' +
              '</thead>' +

              '<tbody>' +
                rows.join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</section>'
      );
    }

    function setNavigation(pageName) {
      document
        .querySelectorAll(
          '.navigation button'
        )
        .forEach(button => {
          button.classList.toggle(
            'active',
            button.dataset.page === pageName
          );
        });

      const title = pageName
        .replace(/-/g, ' ')
        .replace(
          /\b\w/g,
          character =>
            character.toUpperCase()
        );

      document.getElementById(
        'breadcrumb'
      ).textContent =
        'Portfolio Management / ' + title;
    }

    function showPage(pageName) {
      setNavigation(pageName);

      const renderers = {
        overview: renderOverview,
        health: renderPortfolioHealth,
        services: renderServices,
        offerings: renderOfferings,
        products: renderProducts,
        relationships: renderRelationships,
        assessments: renderAssessments,
        quality: renderDataQuality
      };

      const renderer =
        renderers[pageName] ||
        renderOverview;

      document.getElementById(
        'content'
      ).innerHTML = renderer();

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    function renderOverview() {
      const coverage =
        viewModel.coverage;

      const domainCards =
        viewModel.domains
          .map(domain => {
            return (
              '<button ' +
                'class="card domain-card" ' +
                'onclick="openDomain(\'' +
                  domain.id +
                '\')">' +

                '<div>' +
                  renderTag(
                    domain.validationStatus
                  ) +
                '</div>' +

                '<h3>' +
                  escapeHtml(domain.name) +
                '</h3>' +

                '<p>' +
                  escapeHtml(
                    domain.description
                  ) +
                '</p>' +

                '<div class="counts">' +
                  '<div>' +
                    '<strong>' +
                      domain.serviceCount +
                    '</strong>' +
                    '<small>Services</small>' +
                  '</div>' +

                  '<div>' +
                    '<strong>' +
                      domain.offeringCount +
                    '</strong>' +
                    '<small>Offerings</small>' +
                  '</div>' +
                '</div>' +

                '<div class="tag-list">' +
                  renderTag(domain.source) +
                '</div>' +
              '</button>'
            );
          })
          .join('');

      return (
        renderHero(
          'ENTERPRISE SERVICES PLATFORMS',
          'Portfolio Overview',
          'Understand what we provide, connect it to enabling technology, assess health and maturity, choose a direction, and track action.',
          'Assessment values are synthetic placeholders until validated by portfolio owners.'
        ) +

        '<section class="metrics">' +
          renderMetric(
            viewModel.domains.length,
            'Domains',
            'Strategic capability pillars'
          ) +

          renderMetric(
            viewModel.services.length,
            'Services',
            'Managed capabilities'
          ) +

          renderMetric(
            viewModel.offerings.length,
            'Offerings',
            'Consumer outcomes'
          ) +

          renderMetric(
            viewModel.products.length,
            'Products & Systems',
            'Technology enablers'
          ) +

          renderMetric(
            viewModel.relationships.length,
            'Relationships',
            'Curated offering mappings'
          ) +
        '</section>' +

        '<div class="section-heading">' +
          '<div>' +
            '<div class="eyebrow">' +
              'PORTFOLIO STRUCTURE' +
            '</div>' +

            '<h2>' +
              'Four strategic domains' +
            '</h2>' +
          '</div>' +
        '</div>' +

        '<section class="domain-grid">' +
          domainCards +
        '</section>' +

        '<div class="section-heading">' +
          '<div>' +
            '<div class="eyebrow">' +
              'ASSESSMENT COVERAGE' +
            '</div>' +

            '<h2>' +
              'Evidence status' +
            '</h2>' +
          '</div>' +
        '</div>' +

        '<section class="coverage-grid">' +
          '<div class="panel coverage-card">' +
            '<strong>' +
              coverage.validated +
            '</strong>' +
            '<span>Validated assessments</span>' +
          '</div>' +

          '<div class="panel coverage-card">' +
            '<strong>' +
              coverage.synthetic +
            '</strong>' +
            '<span>Synthetic placeholders</span>' +
          '</div>' +

          '<div class="panel coverage-card">' +
            '<strong>' +
              coverage.missing +
            '</strong>' +
            '<span>Missing assessments</span>' +
          '</div>' +

          '<div class="panel coverage-card">' +
            '<strong>' +
              coverage.needsReview +
            '</strong>' +
            '<span>Offerings needing review</span>' +
          '</div>' +
        '</section>'
      );
    }

    function countAssessmentValues(field) {
      return viewModel.offerings.reduce(
        (counts, offering) => {
          const assessment =
            getAssessment(offering);

          const value =
            assessment[field] || 'Unknown';

          counts[value] =
            (counts[value] || 0) + 1;

          return counts;
        },
        {}
      );
    }

    function renderBars(values, total) {
      return Object.entries(values)
        .map(([label, count]) => {
          const percentage = total
            ? Math.round(
                count / total * 100
              )
            : 0;

          return (
            '<div class="chart-row">' +
              '<span>' +
                escapeHtml(label) +
              '</span>' +

              '<div class="bar">' +
                '<div ' +
                  'class="bar-fill" ' +
                  'style="width:' +
                    percentage +
                  '%">' +
                '</div>' +
              '</div>' +

              '<strong>' +
                count +
              '</strong>' +
            '</div>'
          );
        })
        .join('');
    }

    function renderPortfolioHealth() {
      const health =
        countAssessmentValues('health');

      const maturity =
        countAssessmentValues('maturity');

      const direction =
        countAssessmentValues('direction');

      return (
        renderHero(
          'ASSESS • DIRECT • MEASURE',
          'Portfolio Health',
          'View assessment signals independently rather than hiding them inside a single artificial score.',
          'Synthetic demo assessments are clearly separated from validated owner assessments.'
        ) +

        '<section class="two-column">' +
          '<div class="panel quality-panel">' +
            '<div class="eyebrow">HEALTH</div>' +
            '<h2>Offering health</h2>' +
            renderBars(
              health,
              viewModel.offerings.length
            ) +
          '</div>' +

          '<div class="panel quality-panel">' +
            '<div class="eyebrow">MATURITY</div>' +
            '<h2>Capability maturity</h2>' +
            renderBars(
              maturity,
              viewModel.offerings.length
            ) +
          '</div>' +

          '<div class="panel quality-panel">' +
            '<div class="eyebrow">DIRECTION</div>' +
            '<h2>Strategic direction</h2>' +
            renderBars(
              direction,
              viewModel.offerings.length
            ) +
          '</div>' +

          '<div class="panel quality-panel">' +
            '<div class="eyebrow">COVERAGE</div>' +
            '<h2>Assessment integrity</h2>' +
            renderBars(
              {
                Validated:
                  viewModel.coverage.validated,
                Synthetic:
                  viewModel.coverage.synthetic,
                Missing:
                  viewModel.coverage.missing
              },
              viewModel.offerings.length
            ) +
          '</div>' +
        '</section>'
      );
    }

    function renderToolbar(entityName) {
      return (
        '<div class="toolbar">' +
          '<div class="filters">' +
            '<input ' +
              'class="search" ' +
              'placeholder="Filter ' +
                escapeHtml(entityName) +
              '..." ' +
              'oninput="filterRows(this.value)">' +

            '<select ' +
              'onchange="' +
                'filterRows(' +
                  'document.querySelector(' +
                    '\'.search\'' +
                  ').value,' +
                  'this.value' +
                ')' +
              '">' +

              '<option value="">' +
                'All domains' +
              '</option>' +

              viewModel.domains
                .map(
                  domain =>
                    '<option>' +
                      escapeHtml(
                        domain.name
                      ) +
                    '</option>'
                )
                .join('') +
            '</select>' +
          '</div>' +

          '<span ' +
            'class="visible-count" ' +
            'id="visible-count">' +
          '</span>' +
        '</div>'
      );
    }

    function renderInventoryPage(
      eyebrow,
      title,
      description,
      entityName,
      headers,
      rows
    ) {
      const table = renderTable(
        headers,
        rows
      );

      const innerTable = table
        .replace(
          '<section class="panel table-panel">',
          ''
        )
        .replace(
          '</section>',
          ''
        );

      return (
        renderHero(
          eyebrow,
          title,
          description
        ) +

        '<section class="panel table-panel">' +
          renderToolbar(entityName) +
          innerTable +
        '</section>'
      );
    }

    function renderServices() {
      const rows =
        viewModel.services.map(service => {
          const searchText = (
            service.name + ' ' +
            service.domainName + ' ' +
            (service.owner || '')
          ).toLowerCase();

          return (
            '<tr ' +
              'data-search="' +
                escapeHtml(searchText) +
              '" ' +
              'data-domain="' +
                escapeHtml(
                  service.domainName
                ) +
              '">' +

              '<td>' +
                '<button ' +
                  'class="link-button" ' +
                  'onclick="openService(\'' +
                    service.id +
                  '\')">' +
                  escapeHtml(
                    service.name
                  ) +
                '</button>' +

                '<div class="secondary-text">' +
                  escapeHtml(
                    service.description
                  ) +
                '</div>' +
              '</td>' +

              '<td>' +
                escapeHtml(
                  service.domainName
                ) +
              '</td>' +

              '<td>' +
                escapeHtml(
                  service.owner ||
                  'Unassigned'
                ) +
              '</td>' +

              '<td>' +
                service.offeringCount +
              '</td>' +

              '<td>' +
                renderTag(
                  service.lifecycle
                ) +
              '</td>' +

              '<td>' +
                renderTag(
                  service.validationStatus
                ) +
              '</td>' +
            '</tr>'
          );
        });

      return renderInventoryPage(
        'PORTFOLIO INVENTORY',
        'Services',
        'Managed capabilities organized under the four strategic domains.',
        'services',
        [
          'Service',
          'Domain',
          'Owner',
          'Offerings',
          'Lifecycle',
          'Validation'
        ],
        rows
      );
    }

    function renderOfferings() {
      const rows =
        viewModel.offerings.map(offering => {
          const assessment =
            getAssessment(offering);

          const searchText = (
            offering.name + ' ' +
            offering.serviceName + ' ' +
            offering.domainName + ' ' +
            (offering.owner || '')
          ).toLowerCase();

          return (
            '<tr ' +
              'data-search="' +
                escapeHtml(searchText) +
              '" ' +
              'data-domain="' +
                escapeHtml(
                  offering.domainName
                ) +
              '">' +

              '<td>' +
                '<button ' +
                  'class="link-button" ' +
                  'onclick="openOffering(\'' +
                    offering.id +
                  '\')">' +
                  escapeHtml(
                    offering.name
                  ) +
                '</button>' +

                '<div class="secondary-text">' +
                  escapeHtml(
                    offering.serviceName
                  ) +
                '</div>' +
              '</td>' +

              '<td>' +
                escapeHtml(
                  offering.domainName
                ) +
              '</td>' +

              '<td>' +
                renderHealth(
                  assessment.health
                ) +
              '</td>' +

              '<td>' +
                renderTag(
                  assessment.maturity
                ) +
              '</td>' +

              '<td>' +
                renderTag(
                  assessment.direction
                ) +
              '</td>' +

              '<td>' +
                renderSynthetic(
                  assessment
                ) +
              '</td>' +

              '<td>' +
                offering.products.length +
              '</td>' +
            '</tr>'
          );
        });

      return renderInventoryPage(
        'PORTFOLIO INVENTORY',
        'Service Offerings',
        'Discrete outcomes consumed by employees and business teams.',
        'offerings',
        [
          'Offering',
          'Domain',
          'Health',
          'Maturity',
          'Direction',
          'Evidence State',
          'Products'
        ],
        rows
      );
    }

    function renderProducts() {
      const rows =
        viewModel.products.map(product => {
          const searchText = (
            product.name + ' ' +
            (product.vendor || '') + ' ' +
            (product.primaryDomainId || '')
          ).toLowerCase();

          return (
            '<tr ' +
              'data-search="' +
                escapeHtml(searchText) +
              '">' +

              '<td>' +
                '<button ' +
                  'class="link-button" ' +
                  'onclick="openProduct(\'' +
                    product.id +
                  '\')">' +
                  escapeHtml(
                    product.name
                  ) +
                '</button>' +
              '</td>' +

              '<td>' +
                escapeHtml(
                  product.vendor ||
                  'Unknown'
                ) +
              '</td>' +

              '<td>' +
                renderTag(
                  product.lifecycle
                ) +
              '</td>' +

              '<td>' +
                product.offerings.length +
              '</td>' +

              '<td>' +
                renderTag(
                  product.validationStatus
                ) +
              '</td>' +

              '<td>' +
                escapeHtml(
                  product.evidence || ''
                ) +
              '</td>' +
            '</tr>'
          );
        });

      return renderInventoryPage(
        'TECHNOLOGY PORTFOLIO',
        'Products & Systems',
        'Technology platforms, applications, modules, and internal systems that enable portfolio offerings.',
        'products',
        [
          'Product / System',
          'Vendor',
          'Lifecycle',
          'Mapped Offerings',
          'Validation',
          'Evidence Basis'
        ],
        rows
      );
    }

    function renderRelationships() {
      const offeringById = new Map(
        viewModel.offerings.map(
          offering => [
            offering.id,
            offering
          ]
        )
      );

      const productById = new Map(
        viewModel.products.map(
          product => [
            product.id,
            product
          ]
        )
      );

      const rows =
        viewModel.relationships.map(
          relationship => {
            const offering =
              offeringById.get(
                relationship.offeringId
              );

            const product =
              productById.get(
                relationship.productId
              );

            const searchText = (
              (offering?.name || '') + ' ' +
              (product?.name || '') + ' ' +
              relationship.role + ' ' +
              relationship.confidence
            ).toLowerCase();

            return (
              '<tr ' +
                'data-search="' +
                  escapeHtml(searchText) +
                '" ' +
                'data-domain="' +
                  escapeHtml(
                    offering?.domainName || ''
                  ) +
                '">' +

                '<td>' +
                  escapeHtml(
                    offering?.name ||
                    relationship.offeringId
                  ) +

                  '<div class="secondary-text">' +
                    escapeHtml(
                      offering?.serviceName ||
                      ''
                    ) +
                  '</div>' +
                '</td>' +

                '<td>' +
                  escapeHtml(
                    product?.name ||
                    relationship.productId
                  ) +
                '</td>' +

                '<td>' +
                  renderTag(
                    relationship.role
                  ) +
                '</td>' +

                '<td>' +
                  renderTag(
                    relationship.confidence
                  ) +
                '</td>' +

                '<td>' +
                  renderTag(
                    relationship.status
                  ) +
                '</td>' +

                '<td>' +
                  renderHealth(
                    relationship.health
                  ) +
                '</td>' +

                '<td>' +
                  renderTag(
                    relationship.validationStatus
                  ) +
                '</td>' +
              '</tr>'
            );
          }
        );

      return renderInventoryPage(
        'CONNECT',
        'Offering–Product Map',
        'Shows why a product is connected to an offering, confidence in the mapping, and the health of the relationship.',
        'relationships',
        [
          'Offering',
          'Product / System',
          'Relationship Role',
          'Confidence',
          'Status',
          'Relationship Health',
          'Validation'
        ],
        rows
      );
    }

    function renderAssessments() {
      const offeringById = new Map(
        viewModel.offerings.map(
          offering => [
            offering.id,
            offering
          ]
        )
      );

      const assessments = [
        ...viewModel.assessments
      ].sort(
        (left, right) =>
          String(
            right.assessmentDate
          ).localeCompare(
            String(
              left.assessmentDate
            )
          )
      );

      const rows =
        assessments.map(assessment => {
          const offering =
            offeringById.get(
              assessment.entityId
            );

          const searchText = (
            (offering?.name || '') + ' ' +
            assessment.health + ' ' +
            assessment.maturity + ' ' +
            assessment.direction + ' ' +
            assessment.status
          ).toLowerCase();

          return (
            '<tr ' +
              'data-search="' +
                escapeHtml(searchText) +
              '" ' +
              'data-domain="' +
                escapeHtml(
                  offering?.domainName || ''
                ) +
              '">' +

              '<td>' +
                escapeHtml(
                  offering?.name ||
                  assessment.entityId
                ) +

                '<div class="secondary-text">' +
                  escapeHtml(
                    offering?.serviceName ||
                    ''
                  ) +
                '</div>' +
              '</td>' +

              '<td>' +
                escapeHtml(
                  assessment.assessmentDate ||
                  ''
                ) +
              '</td>' +

              '<td>' +
                renderHealth(
                  assessment.health
                ) +
              '</td>' +

              '<td>' +
                renderTag(
                  assessment.maturity
                ) +
              '</td>' +

              '<td>' +
                renderTag(
                  assessment.direction
                ) +
              '</td>' +

              '<td>' +
                renderTag(
                  assessment.risk
                ) +
              '</td>' +

              '<td>' +
                renderTag(
                  assessment.strategicFit
                ) +
              '</td>' +

              '<td>' +
                renderSynthetic(
                  assessment
                ) +

                renderTag(
                  assessment.status
                ) +
              '</td>' +
            '</tr>'
          );
        });

      return renderInventoryPage(
        'ASSESS',
        'Assessments',
        'Point-in-time records covering health, maturity, direction, lifecycle, risk, cost, strategic fit, evidence, outcomes, and recommended action.',
        'assessments',
        [
          'Offering',
          'Date',
          'Health',
          'Maturity',
          'Direction',
          'Risk',
          'Strategic Fit',
          'State'
        ],
        rows
      );
    }

    function renderDataQuality() {
      const result =
        viewModel.validation;

      const errors =
        result.errors.length
          ? result.errors
              .map(
                error =>
                  '<li>' +
                    escapeHtml(error) +
                  '</li>'
              )
              .join('')
          : '<li>No structural errors detected.</li>';

      const warnings =
        result.warnings.length
          ? result.warnings
              .map(
                warning =>
                  '<li>' +
                    escapeHtml(warning) +
                  '</li>'
              )
              .join('')
          : '<li>No warnings.</li>';

      return (
        renderHero(
          'DATA FOUNDATION',
          'Data Quality',
          'Make gaps visible before portfolio information is used for decisions.'
        ) +

        '<section class="two-column">' +
          '<div class="panel quality-panel">' +
            '<div class="eyebrow">VALIDATION</div>' +

            '<h2>' +
              (
                result.valid
                  ? 'Data model is structurally valid'
                  : 'Structural errors found'
              ) +
            '</h2>' +

            '<ul>' +
              errors +
            '</ul>' +
          '</div>' +

          '<div class="panel quality-panel">' +
            '<div class="eyebrow">WARNINGS</div>' +

            '<h2>' +
              result.warnings.length +
              ' warning(s)' +
            '</h2>' +

            '<ul>' +
              warnings +
            '</ul>' +
          '</div>' +

          '<div class="panel quality-panel">' +
            '<div class="eyebrow">PROVENANCE</div>' +
            '<h2>Source transparency</h2>' +
            '<ul>' +
              '<li>Monday: current board inventory</li>' +
              '<li>Other Agent: additional discoveries</li>' +
              '<li>Both: present in both working models</li>' +
              '<li>Proposed: requires owner review</li>' +
            '</ul>' +
          '</div>' +

          '<div class="panel quality-panel">' +
            '<div class="eyebrow">ASSESSMENT STATUS</div>' +
            '<h2>Coverage controls</h2>' +
            '<ul>' +
              '<li>' +
                viewModel.coverage.validated +
                ' validated assessments' +
              '</li>' +

              '<li>' +
                viewModel.coverage.synthetic +
                ' synthetic demo assessments' +
              '</li>' +

              '<li>' +
                viewModel.coverage.missing +
                ' missing assessments' +
              '</li>' +

              '<li>' +
                viewModel.coverage.needsReview +
                ' offerings need review' +
              '</li>' +
            '</ul>' +
          '</div>' +
        '</section>'
      );
    }

    function renderOfferingCard(offering) {
      const assessment =
        getAssessment(offering);

      const productChips =
        offering.products
          .slice(0, 4)
          .map(
            product =>
              '<span class="product-chip">' +
                escapeHtml(product.name) +
              '</span>'
          )
          .join('');

      return (
        '<article class="card offering-card">' +
          '<div>' +
            renderHealth(
              assessment.health
            ) +

            ' ' +

            renderSynthetic(
              assessment
            ) +
          '</div>' +

          '<h4>' +
            '<button ' +
              'class="link-button" ' +
              'onclick="openOffering(\'' +
                offering.id +
              '\')">' +
              escapeHtml(
                offering.name
              ) +
            '</button>' +
          '</h4>' +

          '<div class="assessment-meta">' +
            '<div>' +
              '<label>Maturity</label>' +
              '<strong>' +
                escapeHtml(
                  assessment.maturity ||
                  'Unknown'
                ) +
              '</strong>' +
            '</div>' +

            '<div>' +
              '<label>Direction</label>' +
              '<strong>' +
                escapeHtml(
                  assessment.direction ||
                  'Unknown'
                ) +
              '</strong>' +
            '</div>' +

            '<div>' +
              '<label>Products</label>' +
              '<strong>' +
                offering.products.length +
              '</strong>' +
            '</div>' +
          '</div>' +

          '<div>' +
            productChips +
          '</div>' +
        '</article>'
      );
    }

    function openDomain(domainId) {
      const domain =
        viewModel.domains.find(
          item => item.id === domainId
        );

      if (!domain) {
        return;
      }

      setNavigation('');

      document.getElementById(
        'breadcrumb'
      ).textContent =
        'Portfolio / ' + domain.name;

      const serviceSections =
        domain.services
          .map(service => {
            return (
              '<section class="service-section">' +
                '<div class="service-title">' +
                  '<div>' +
                    '<div class="eyebrow">SERVICE</div>' +
                    '<h3>' +
                      escapeHtml(
                        service.name
                      ) +
                    '</h3>' +
                  '</div>' +

                  '<button ' +
                    'class="link-button" ' +
                    'onclick="openService(\'' +
                      service.id +
                    '\')">' +
                    service.offeringCount +
                    ' offerings →' +
                  '</button>' +
                '</div>' +

                '<div class="offering-grid">' +
                  service.offerings
                    .map(renderOfferingCard)
                    .join('') +
                '</div>' +
              '</section>'
            );
          })
          .join('');

      document.getElementById(
        'content'
      ).innerHTML =
        '<div class="detail-navigation">' +
          '<button ' +
            'class="back-button" ' +
            'onclick="showPage(\'overview\')">' +
            '← Overview' +
          '</button>' +
        '</div>' +

        '<section class="detail-hero">' +
          '<div>' +
            '<div class="eyebrow">' +
              'STRATEGIC DOMAIN' +
            '</div>' +

            '<h1>' +
              escapeHtml(domain.name) +
            '</h1>' +

            '<p>' +
              escapeHtml(
                domain.description
              ) +
            '</p>' +
          '</div>' +

          '<div class="detail-scorecard">' +
            '<div>' +
              '<label>Services</label>' +
              '<strong>' +
                domain.serviceCount +
              '</strong>' +
            '</div>' +

            '<div>' +
              '<label>Offerings</label>' +
              '<strong>' +
                domain.offeringCount +
              '</strong>' +
            '</div>' +

            '<div>' +
              '<label>Validation</label>' +
              renderTag(
                domain.validationStatus
              ) +
            '</div>' +
          '</div>' +
        '</section>' +

        serviceSections;

      window.scrollTo({
        top: 0
      });
    }

    function openService(serviceId) {
      const service =
        viewModel.services.find(
          item => item.id === serviceId
        );

      if (!service) {
        return;
      }

      const domain =
        viewModel.domains.find(
          item =>
            item.id === service.domainId
        );

      document.getElementById(
        'breadcrumb'
      ).textContent =
        'Services / ' + service.name;

      document.getElementById(
        'content'
      ).innerHTML =
        '<div class="detail-navigation">' +
          '<button ' +
            'class="back-button" ' +
            'onclick="showPage(\'services\')">' +
            '← Services' +
          '</button>' +

          '<button ' +
            'class="back-button" ' +
            'onclick="openDomain(\'' +
              service.domainId +
            '\')">' +
            escapeHtml(
              domain?.name || 'Domain'
            ) +
          '</button>' +
        '</div>' +

        renderHero(
          'SERVICE',
          service.name,
          service.description
        ) +

        '<div class="offering-grid">' +
          service.offerings
            .map(renderOfferingCard)
            .join('') +
        '</div>';

      window.scrollTo({
        top: 0
      });
    }

    function openOffering(offeringId) {
      const offering =
        viewModel.offerings.find(
          item => item.id === offeringId
        );

      if (!offering) {
        return;
      }

      const assessment =
        getAssessment(offering);

      const relationships =
        offering.products.length
          ? offering.products
              .map(product => {
                return (
                  '<p>' +
                    '<button ' +
                      'class="link-button" ' +
                      'onclick="openProduct(\'' +
                        product.id +
                      '\')">' +
                      escapeHtml(
                        product.name
                      ) +
                    '</button>' +

                    '<br>' +

                    '<span class="secondary-text">' +
                      escapeHtml(
                        product.relationship.role
                      ) +

                      ' • ' +

                      escapeHtml(
                        product.relationship
                          .confidence
                      ) +

                      ' confidence' +
                    '</span>' +
                  '</p>'
                );
              })
              .join('')
          : (
            '<p class="summary">' +
              'No product relationship has been mapped.' +
            '</p>'
          );

      document.getElementById(
        'breadcrumb'
      ).textContent =
        'Offerings / ' + offering.name;

      document.getElementById(
        'content'
      ).innerHTML =
        '<div class="detail-navigation">' +
          '<button ' +
            'class="back-button" ' +
            'onclick="showPage(\'offerings\')">' +
            '← Offerings' +
          '</button>' +

          '<button ' +
            'class="back-button" ' +
            'onclick="openService(\'' +
              offering.serviceId +
            '\')">' +
            escapeHtml(
              offering.serviceName
            ) +
          '</button>' +
        '</div>' +

        renderHero(
          'SERVICE OFFERING',
          offering.name,
          offering.description ||
            'No validated description yet.',
          assessment.syntheticDemo
            ? 'This offering currently uses a synthetic demo assessment.'
            : 'This assessment is not marked as synthetic.'
        ) +

        '<section class="metrics">' +
          renderMetric(
            assessment.health || 'Unknown',
            'Health',
            'Current assessment'
          ) +

          renderMetric(
            assessment.maturity || 'Unknown',
            'Maturity',
            'Capability maturity'
          ) +

          renderMetric(
            assessment.direction || 'Unknown',
            'Direction',
            'Management choice'
          ) +

          renderMetric(
            assessment.risk || 'Unknown',
            'Risk',
            'Assessment signal'
          ) +

          renderMetric(
            offering.products.length,
            'Products',
            'Enabling relationships'
          ) +
        '</section>' +

        '<section class="two-column">' +
          '<div class="panel quality-panel">' +
            '<div class="eyebrow">ASSESSMENT</div>' +
            '<h2>Latest assessment</h2>' +

            '<p class="summary">' +
              escapeHtml(
                assessment.summary ||
                'No assessment summary.'
              ) +
            '</p>' +

            '<div class="tag-list">' +
              renderTag(
                assessment.status
              ) +

              renderTag(
                assessment.strategicFit
              ) +

              renderTag(
                assessment.costSignal
              ) +

              renderSynthetic(
                assessment
              ) +
            '</div>' +
          '</div>' +

          '<div class="panel quality-panel">' +
            '<div class="eyebrow">' +
              'ENABLING TECHNOLOGY' +
            '</div>' +

            '<h2>' +
              'Offering–product relationships' +
            '</h2>' +

            relationships +
          '</div>' +
        '</section>';

      window.scrollTo({
        top: 0
      });
    }

    function openProduct(productId) {
      const product =
        viewModel.products.find(
          item => item.id === productId
        );

      if (!product) {
        return;
      }

      const rows =
        product.offerings.map(offering => {
          return (
            '<tr>' +
              '<td>' +
                '<button ' +
                  'class="link-button" ' +
                  'onclick="openOffering(\'' +
                    offering.id +
                  '\')">' +
                  escapeHtml(
                    offering.name
                  ) +
                '</button>' +
              '</td>' +

              '<td>' +
                escapeHtml(
                  offering.serviceName
                ) +
              '</td>' +

              '<td>' +
                escapeHtml(
                  offering.domainName
                ) +
              '</td>' +

              '<td>' +
                renderTag(
                  offering.relationship.role
                ) +
              '</td>' +

              '<td>' +
                renderTag(
                  offering.relationship
                    .confidence
                ) +
              '</td>' +
            '</tr>'
          );
        });

      document.getElementById(
        'breadcrumb'
      ).textContent =
        'Products / ' + product.name;

      document.getElementById(
        'content'
      ).innerHTML =
        '<div class="detail-navigation">' +
          '<button ' +
            'class="back-button" ' +
            'onclick="showPage(\'products\')">' +
            '← Products' +
          '</button>' +
        '</div>' +

        renderHero(
          'PRODUCT / SYSTEM',
          product.name,
          product.description ||
            'No validated product description yet.'
        ) +

        '<section class="metrics">' +
          renderMetric(
            product.vendor || 'Unknown',
            'Vendor',
            'Supplier or source'
          ) +

          renderMetric(
            product.lifecycle,
            'Lifecycle',
            'Current state'
          ) +

          renderMetric(
            product.offerings.length,
            'Offerings',
            'Mapped relationships'
          ) +

          renderMetric(
            product.validationStatus,
            'Validation',
            'Evidence status'
          ) +

          renderMetric(
            product.source,
            'Source',
            'Record provenance'
          ) +
        '</section>' +

        renderTable(
          [
            'Offering',
            'Service',
            'Domain',
            'Role',
            'Confidence'
          ],
          rows
        );

      window.scrollTo({
        top: 0
      });
    }

    function filterRows(
      query,
      domain = ''
    ) {
      const normalizedQuery =
        String(query || '')
          .toLowerCase();

      const rows = [
        ...document.querySelectorAll(
          'tbody tr'
        )
      ];

      let visible = 0;

      rows.forEach(row => {
        const matchesQuery =
          !normalizedQuery ||
          row.dataset.search?.includes(
            normalizedQuery
          );

        const matchesDomain =
          !domain ||
          row.dataset.domain === domain;

        const shouldDisplay =
          matchesQuery && matchesDomain;

        row.classList.toggle(
          'hidden',
          !shouldDisplay
        );

        if (shouldDisplay) {
          visible += 1;
        }
      });

      const count =
        document.getElementById(
          'visible-count'
        );

      if (count) {
        count.textContent =
          visible + ' visible';
      }
    }

    fetch('/api/view-model')
      .then(response => {
        if (!response.ok) {
          throw new Error(
            'API returned ' +
            response.status
          );
        }

        return response.json();
      })
      .then(data => {
        viewModel = data;
        showPage('overview');
      })
      .catch(error => {
        document.getElementById(
          'content'
        ).innerHTML =
          '<div class="error">' +
            'Unable to load portfolio: ' +
            escapeHtml(error.message) +
          '</div>';
      });
  </script>
</body>
</html>`;

const server = http.createServer(
  (req, res) => {
    const url = new URL(
      req.url,
      `http://${req.headers.host || 'localhost'}`
    );

    const pathname = url.pathname;

    if (pathname === '/healthz') {
      return sendJson(res, 200, {
        status: 'ok',
        service: SERVICE_NAME
      });
    }

    if (pathname === '/api/portfolio') {
      return sendJson(
        res,
        200,
        portfolio
      );
    }

    if (
      pathname === '/api/view-model'
    ) {
      return sendJson(
        res,
        200,
        buildViewModel()
      );
    }

    if (pathname === '/api/summary') {
      const data = buildViewModel();

      return sendJson(res, 200, {
        domains: data.domains.length,
        services: data.services.length,
        offerings: data.offerings.length,
        products: data.products.length,
        relationships:
          data.relationships.length,
        assessments:
          data.assessments.length,
        coverage: data.coverage
      });
    }

    if (pathname === '/api/services') {
      return sendJson(
        res,
        200,
        buildViewModel().services
      );
    }

    if (pathname === '/api/offerings') {
      return sendJson(
        res,
        200,
        buildViewModel().offerings
      );
    }

    if (pathname === '/api/products') {
      return sendJson(
        res,
        200,
        buildViewModel().products
      );
    }

    if (
      pathname ===
      '/api/relationships'
    ) {
      return sendJson(
        res,
        200,
        portfolio.relationships
      );
    }

    if (
      pathname ===
      '/api/assessments'
    ) {
      return sendJson(
        res,
        200,
        portfolio.assessments
      );
    }

    if (
      pathname ===
      '/api/data-quality'
    ) {
      return sendJson(
        res,
        200,
        validation
      );
    }

    if (pathname === '/') {
      res.writeHead(200, {
        'Content-Type':
          'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      });

      res.end(HTML);
      return;
    }

    sendJson(res, 404, {
      error: 'Not found'
    });
  }
);

server.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      JSON.stringify({
        level: 'info',
        message:
          'Enterprise Services Portfolio started',
        service: SERVICE_NAME,
        port: PORT,
        domains:
          portfolio.domains.length,
        services:
          portfolio.services.length,
        offerings:
          portfolio.offerings.length,
        products:
          portfolio.products.length
      })
    );
  }
);