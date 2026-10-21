const http = require('node:http');
const { portfolio, validation } = require('./data/portfolio');
const store = require('./data/store');

const PORT = Number(process.env.PORT || 3000);
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'test-mike';
store.seedAssessments(portfolio.assessments);

function allAssessments() {
  return store.listAssessments();
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 1024) reject(new Error('Request body too large'));
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}


function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store'
  });
  res.end(payload);
}

function latestAssessments() {
  const latest = new Map();
  for (const assessment of allAssessments()) {
    if (assessment.entityType !== 'offering') continue;
    const existing = latest.get(assessment.entityId);
    if (!existing || String(assessment.assessmentDate) > String(existing.assessmentDate)) {
      latest.set(assessment.entityId, assessment);
    }
  }
  return latest;
}

function buildViewModel() {
  const domainById = new Map(portfolio.domains.map(item => [item.id, item]));
  const serviceById = new Map(portfolio.services.map(item => [item.id, item]));
  const offeringById = new Map(portfolio.offerings.map(item => [item.id, item]));
  const productById = new Map(portfolio.products.map(item => [item.id, item]));
  const latestByOffering = latestAssessments();

  const relationshipsByOffering = new Map();
  const relationshipsByProduct = new Map();
  for (const relationship of portfolio.relationships) {
    if (!relationshipsByOffering.has(relationship.offeringId)) relationshipsByOffering.set(relationship.offeringId, []);
    if (!relationshipsByProduct.has(relationship.productId)) relationshipsByProduct.set(relationship.productId, []);
    relationshipsByOffering.get(relationship.offeringId).push(relationship);
    relationshipsByProduct.get(relationship.productId).push(relationship);
  }

  const offerings = portfolio.offerings.map(offering => {
    const service = serviceById.get(offering.serviceId);
    const domain = service ? domainById.get(service.domainId) : null;
    const assessment = latestByOffering.get(offering.id) || null;
    const relationships = relationshipsByOffering.get(offering.id) || [];
    const products = relationships.map(relationship => {
      const product = productById.get(relationship.productId);
      return product ? { ...product, relationship } : null;
    }).filter(Boolean);

    return {
      ...offering,
      serviceName: service?.name || 'Unknown',
      domainId: domain?.id || '',
      domainName: domain?.name || 'Unknown',
      assessment,
      products
    };
  });

  const services = portfolio.services.map(service => {
    const domain = domainById.get(service.domainId);
    const children = offerings.filter(offering => offering.serviceId === service.id);
    return {
      ...service,
      domainName: domain?.name || 'Unknown',
      offeringCount: children.length,
      offerings: children
    };
  });

  const domains = portfolio.domains.map(domain => {
    const children = services.filter(service => service.domainId === domain.id);
    const domainOfferings = children.flatMap(service => service.offerings);
    return {
      ...domain,
      serviceCount: children.length,
      offeringCount: domainOfferings.length,
      services: children
    };
  });

  const products = portfolio.products.map(product => {
    const relationships = relationshipsByProduct.get(product.id) || [];
    const linkedOfferings = relationships.map(relationship => {
      const offering = offeringById.get(relationship.offeringId);
      if (!offering) return null;
      const service = serviceById.get(offering.serviceId);
      const domain = service ? domainById.get(service.domainId) : null;
      return {
        ...offering,
        serviceName: service?.name || 'Unknown',
        domainName: domain?.name || 'Unknown',
        relationship
      };
    }).filter(Boolean);
    return { ...product, relationships, offerings: linkedOfferings };
  });

  const coverage = {
    total: offerings.length,
    validated: offerings.filter(item => item.assessment && !item.assessment.syntheticDemo && item.assessment.status === 'Validated').length,
    synthetic: offerings.filter(item => item.assessment?.syntheticDemo).length,
    missing: offerings.filter(item => !item.assessment).length,
    needsReview: offerings.filter(item => item.validationStatus === 'Needs Review').length
  };

  return {
    metadata: portfolio.metadata,
    domains,
    services,
    offerings,
    products,
    relationships: portfolio.relationships,
    assessments: allAssessments(),
    actions: portfolio.actions,
    coverage,
    validation
  };
}

const HTML = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Enterprise Services Portfolio</title>
  <style>
    :root{--navy:#071d3b;--navy2:#0b2b52;--blue:#1456e0;--blue2:#0d47b5;--bg:#f4f7fb;--panel:#fff;--border:#dce4ee;--text:#10243e;--muted:#68788c;--green:#188657;--greenBg:#e8f6ef;--yellow:#a96f00;--yellowBg:#fff3cf;--red:#c33d4d;--redBg:#fcebed;--purple:#7147c7;--purpleBg:#f0eafd;--shadow:0 6px 22px rgba(13,35,64,.07)}
    *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif} button,input,select,textarea{font:inherit} button{cursor:pointer}.app{min-height:100vh}.sidebar{position:fixed;inset:0 auto 0 0;width:270px;background:linear-gradient(180deg,var(--navy),#082742);color:#fff;display:flex;flex-direction:column;z-index:10}.brand{padding:28px 24px 23px;border-bottom:1px solid rgba(255,255,255,.1)}.brandline{display:flex;gap:11px;align-items:center;font-weight:800;letter-spacing:.06em}.mark{display:grid;grid-template-columns:repeat(2,8px);gap:3px}.mark i{width:8px;height:8px;background:#4b8df0}.product{margin-top:16px;color:rgba(255,255,255,.66);font-size:12px;line-height:1.5}.nav{padding:20px 13px;flex:1}.navlabel{padding:0 12px 8px;color:rgba(255,255,255,.38);font-size:10px;font-weight:800;letter-spacing:.12em}.nav button{width:100%;border:0;background:none;color:rgba(255,255,255,.72);text-align:left;padding:11px 12px;border-radius:7px;margin:2px 0;display:flex;gap:10px}.nav button:hover,.nav button.active{background:var(--blue);color:#fff}.foot{padding:19px 24px;border-top:1px solid rgba(255,255,255,.1);font-size:11px;color:rgba(255,255,255,.48)}.main{margin-left:270px}.top{height:66px;background:#fff;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 35px;position:sticky;top:0;z-index:5}.crumb{font-size:12px;color:var(--muted)}.env{font-size:10px;font-weight:800;color:var(--green);background:var(--greenBg);border-radius:20px;padding:5px 10px}.content{max-width:1600px;margin:auto;padding:40px 40px 80px}.eyebrow{font-size:10px;letter-spacing:.13em;font-weight:850;color:var(--blue);margin-bottom:7px}.hero{display:flex;justify-content:space-between;gap:24px;margin-bottom:30px}.hero h1{margin:0 0 8px;font-size:32px;letter-spacing:-.035em}.hero p{margin:0;color:var(--muted);max-width:780px;line-height:1.6;font-size:13px}.notice{background:var(--yellowBg);color:#795400;border:1px solid #efd78c;padding:10px 13px;border-radius:7px;font-size:11px;max-width:330px}.metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:13px;margin-bottom:34px}.card,.panel{background:#fff;border:1px solid var(--border);box-shadow:var(--shadow);border-radius:9px}.metric{padding:19px}.metric strong{display:block;font-size:28px}.metric span{display:block;font-size:12px;font-weight:750;margin-top:7px}.metric small{color:var(--muted);font-size:10px}.sectionHead{display:flex;align-items:end;justify-content:space-between;margin:30px 0 14px}.sectionHead h2{margin:0;font-size:20px}.sectionHead p{margin:3px 0 0;color:var(--muted);font-size:11px}.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.domain{padding:19px;border-top:3px solid var(--blue);text-align:left;color:inherit}.domain h3{font-size:16px;margin:15px 0 7px}.domain p{font-size:11px;color:var(--muted);line-height:1.55;min-height:70px}.counts{display:flex;gap:26px;padding:12px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}.counts strong,.counts small{display:block}.counts small{font-size:9px;color:var(--muted)}.tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:13px}.tag{display:inline-flex;padding:4px 7px;border-radius:4px;background:#edf2f7;color:#475b73;font-size:9px;font-weight:750}.badge{display:inline-flex;gap:5px;align-items:center;padding:4px 8px;border-radius:20px;font-size:9px;font-weight:800}.dot{width:7px;height:7px;border-radius:50%}.green{background:var(--greenBg);color:var(--green)}.green .dot,.dot.green{background:var(--green)}.yellow{background:var(--yellowBg);color:var(--yellow)}.yellow .dot,.dot.yellow{background:#d99a12}.red{background:var(--redBg);color:var(--red)}.red .dot,.dot.red{background:var(--red)}.unknown{background:#edf2f7;color:#65758a}.unknown .dot{background:#8090a3}.synthetic{background:var(--purpleBg);color:var(--purple)}.toolbar{padding:17px 20px;display:flex;gap:10px;align-items:center;justify-content:space-between}.filters{display:flex;gap:8px;flex-wrap:wrap}.search,select{border:1px solid var(--border);background:#fbfcfe;border-radius:6px;padding:8px 10px;font-size:11px;color:var(--text)}.search{min-width:300px}.count{font-size:10px;color:var(--muted)}.tableWrap{overflow:auto}.tablePanel{overflow:hidden}table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;text-transform:uppercase;letter-spacing:.08em;font-size:9px;color:var(--muted);background:#f8fafc;padding:10px 14px;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}td{padding:13px 14px;border-bottom:1px solid #edf1f5;vertical-align:top}tr:hover td{background:#fbfcfe}.link{border:0;background:none;color:var(--blue);font-weight:750;padding:0;text-align:left}.sub{font-size:9px;color:var(--muted);margin-top:3px}.detailTop{display:flex;gap:10px;align-items:center;margin-bottom:20px}.back{border:1px solid var(--border);background:#fff;border-radius:6px;padding:7px 10px;font-size:10px}.detailHero{background:var(--navy);color:#fff;padding:27px;border-radius:10px;display:grid;grid-template-columns:1fr auto;gap:30px}.detailHero h1{margin:0 0 8px;font-size:28px}.detailHero p{margin:0;color:rgba(255,255,255,.67);font-size:12px;line-height:1.6}.score{display:flex;gap:24px;align-items:center}.score label{display:block;font-size:8px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}.serviceBlock{margin-top:29px}.serviceTitle{display:flex;justify-content:space-between;align-items:end;margin-bottom:11px}.serviceTitle h3{margin:0}.offeringGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.offering{padding:16px}.offering h4{margin:7px 0 12px;font-size:13px}.assessmentMeta{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin:13px 0}.assessmentMeta div{padding:9px 5px}.assessmentMeta div+div{border-left:1px solid var(--border)}.assessmentMeta label,.kv label{font-size:8px;text-transform:uppercase;color:var(--muted);display:block}.assessmentMeta strong,.kv strong{font-size:10px;display:block;margin-top:4px}.summary{font-size:10px;color:var(--muted);line-height:1.5}.productChip{display:inline-flex;background:#eef3f8;padding:4px 7px;border-radius:4px;font-size:9px;margin:3px 3px 0 0}.coverage{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.coverage .panel{padding:18px}.coverage strong{display:block;font-size:25px}.coverage span{font-size:10px;color:var(--muted)}.empty{padding:50px;text-align:center;color:var(--muted)}.hidden{display:none!important}.quality{padding:20px}.quality ul{margin:8px 0 0;padding-left:19px;color:var(--muted);font-size:11px;line-height:1.7}.twoCol{display:grid;grid-template-columns:1fr 1fr;gap:13px}.chartRow{display:grid;grid-template-columns:120px 1fr 28px;gap:10px;align-items:center;margin:12px 0;font-size:10px}.bar{height:8px;background:#edf1f5;border-radius:4px;overflow:hidden}.fill{height:100%}.actions{display:flex;gap:8px}.primary{border:0;background:var(--blue);color:#fff;border-radius:6px;padding:8px 11px;font-size:10px;font-weight:750}.workspaceGrid{display:grid;grid-template-columns:360px 1fr;gap:14px}.formPanel{padding:22px}.field{margin-bottom:16px}.field label{display:block;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:6px}.field input,.field select,.field textarea{width:100%;border:1px solid var(--border);border-radius:6px;padding:9px 10px;background:#fff;color:var(--text);font:inherit}.field textarea{min-height:90px;resize:vertical}.choiceGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.choice{border:1px solid var(--border);background:#fff;border-radius:6px;padding:9px;font-size:10px;font-weight:750}.choice.active{border-color:var(--blue);background:var(--blue-light);color:var(--blue)}.formActions{display:flex;gap:8px;justify-content:flex-end;padding-top:14px;border-top:1px solid var(--border)}.save{border:0;background:var(--blue);color:#fff;border-radius:6px;padding:9px 13px;font-weight:750;font-size:11px}.save:hover{background:var(--blue2)}.ghost{border:1px solid var(--border);background:#fff;border-radius:6px;padding:9px 13px;font-size:11px}.historyItem{padding:13px 0;border-bottom:1px solid var(--border)}.historyItem:last-child{border-bottom:0}.successBox{background:var(--greenBg);color:var(--green);border:1px solid #bfe6d0;border-radius:7px;padding:10px;margin-bottom:14px;font-size:11px}.warningBox{background:var(--yellowBg);color:var(--yellow);border:1px solid #efd78c;border-radius:7px;padding:10px;margin-bottom:14px;font-size:11px}@media(max-width:1150px){.metrics{grid-template-columns:repeat(3,1fr)}.grid4,.offeringGrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.sidebar{position:static;width:100%}.nav{display:flex;overflow:auto}.navlabel,.foot{display:none}.nav button{width:auto;white-space:nowrap}.main{margin:0}.top{padding:0 18px}.content{padding:25px 17px 55px}.metrics,.grid4,.offeringGrid,.coverage,.twoCol,.workspaceGrid{grid-template-columns:1fr}.hero,.detailHero{display:block}.notice,.score{margin-top:18px}.search{min-width:180px}.toolbar{align-items:flex-start;flex-direction:column}}
  </style>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="brand"><div class="brandline"><span class="mark"><i></i><i></i><i></i><i></i></span>DLR</div><div class="product">Enterprise Services<br>Portfolio</div></div>
    <div class="nav">
      <div class="navlabel">MANAGE</div>
      <button data-page="overview" onclick="showPage('overview')">⌂ Overview</button>
      <button data-page="health" onclick="showPage('health')">◉ Portfolio Health</button>
      <button data-page="services" onclick="showPage('services')">▦ Services</button>
      <button data-page="offerings" onclick="showPage('offerings')">◫ Service Offerings</button>
      <button data-page="products" onclick="showPage('products')">◇ Products & Systems</button>
      <button data-page="relationships" onclick="showPage('relationships')">⇄ Offering–Product Map</button>
      <button data-page="assessments" onclick="showPage('assessments')">✓ Assessments</button>
      <button data-page="workspace" onclick="showPage('workspace')">✎ Assessment Workspace</button>
      <button data-page="quality" onclick="showPage('quality')">⚑ Data Quality</button>
    </div>
    <div class="foot">Enterprise Services Platforms<br>V1 prototype</div>
  </aside>
  <div class="main">
    <header class="top"><div class="crumb" id="crumb">Portfolio Management</div><div class="env">DEV</div></header>
    <main class="content" id="content"><div class="empty">Loading portfolio…</div></main>
  </div>
</div>
<script>
let vm=null; let current='overview';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const tag=v=>'<span class="tag">'+esc(v||'Unknown')+'</span>';
const health=v=>{const x=(v||'unknown').toLowerCase();return '<span class="badge '+x+'"><i class="dot"></i>'+esc(v? v[0].toUpperCase()+v.slice(1):'Unknown')+'</span>'};
const synthetic=a=>a?.syntheticDemo?'<span class="badge synthetic">Synthetic demo</span>':'';
const latest=o=>o.assessment||{};
function hero(kicker,title,text,notice=''){return '<section class="hero"><div><div class="eyebrow">'+esc(kicker)+'</div><h1>'+esc(title)+'</h1><p>'+esc(text)+'</p></div>'+(notice?'<div class="notice">'+esc(notice)+'</div>':'')+'</section>'}
function metric(n,label,sub){return '<div class="card metric"><strong>'+n+'</strong><span>'+esc(label)+'</span><small>'+esc(sub)+'</small></div>'}
function table(headers,rows){return '<section class="panel tablePanel"><div class="tableWrap"><table><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div></section>'}
function setNav(page){document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));document.getElementById('crumb').textContent='Portfolio Management / '+page.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function showPage(page){current=page;setNav(page);const render={overview:renderOverview,health:renderHealth,services:renderServices,offerings:renderOfferings,products:renderProducts,relationships:renderRelationships,assessments:renderAssessments,workspace:renderWorkspace,quality:renderQuality}[page]||renderOverview;document.getElementById('content').innerHTML=render();window.scrollTo({top:0,behavior:'smooth'})}
function renderOverview(){const c=vm.coverage;return hero('ENTERPRISE SERVICES PLATFORMS','Portfolio Overview','Understand what we provide, connect it to enabling technology, assess health and maturity, choose a direction, and track action.','Assessment values are synthetic placeholders until validated by portfolio owners.')+'<section class="metrics">'+metric(vm.domains.length,'Domains','Strategic capability pillars')+metric(vm.services.length,'Services','Managed capabilities')+metric(vm.offerings.length,'Offerings','Consumer outcomes')+metric(vm.products.length,'Products & Systems','Technology enablers')+metric(vm.relationships.length,'Relationships','Curated offering mappings')+'</section><div class="sectionHead"><div><div class="eyebrow">PORTFOLIO STRUCTURE</div><h2>Four strategic domains</h2></div></div><section class="grid4">'+vm.domains.map(d=>'<button class="card domain" onclick="openDomain(\''+d.id+'\')"><div>'+tag(d.validationStatus)+'</div><h3>'+esc(d.name)+'</h3><p>'+esc(d.description)+'</p><div class="counts"><div><strong>'+d.serviceCount+'</strong><small>Services</small></div><div><strong>'+d.offeringCount+'</strong><small>Offerings</small></div></div><div class="tags">'+tag(d.source)+'</div></button>').join('')+'</section><div class="sectionHead"><div><div class="eyebrow">ASSESSMENT COVERAGE</div><h2>Evidence status</h2></div></div><section class="coverage"><div class="panel"><strong>'+c.validated+'</strong><span>Validated assessments</span></div><div class="panel"><strong>'+c.synthetic+'</strong><span>Synthetic placeholders</span></div><div class="panel"><strong>'+c.missing+'</strong><span>Missing assessments</span></div><div class="panel"><strong>'+c.needsReview+'</strong><span>Offerings needing review</span></div></section>'}
function renderHealth(){const counts=k=>vm.offerings.reduce((m,o)=>{const v=latest(o)[k]||'Unknown';m[v]=(m[v]||0)+1;return m},{});const h=counts('health'),m=counts('maturity'),d=counts('direction');const bars=(obj,total)=>Object.entries(obj).map(([k,v])=>'<div class="chartRow"><span>'+esc(k)+'</span><div class="bar"><div class="fill" style="width:'+Math.round(v/total*100)+'%;background:var(--blue)"></div></div><strong>'+v+'</strong></div>').join('');return hero('ASSESS • DIRECT • MEASURE','Portfolio Health','View assessment signals independently rather than hiding them inside a single artificial score.','Synthetic demo assessments are clearly separated from validated owner assessments.')+'<section class="twoCol"><div class="panel quality"><div class="eyebrow">HEALTH</div><h2>Offering health</h2>'+bars(h,vm.offerings.length)+'</div><div class="panel quality"><div class="eyebrow">MATURITY</div><h2>Capability maturity</h2>'+bars(m,vm.offerings.length)+'</div><div class="panel quality"><div class="eyebrow">DIRECTION</div><h2>Strategic direction</h2>'+bars(d,vm.offerings.length)+'</div><div class="panel quality"><div class="eyebrow">COVERAGE</div><h2>Assessment integrity</h2>'+bars({Validated:vm.coverage.validated,Synthetic:vm.coverage.synthetic,Missing:vm.coverage.missing},vm.offerings.length)+'</div></section>'}
function toolbar(type){return '<div class="toolbar"><div class="filters"><input class="search" placeholder="Filter '+esc(type)+'…" oninput="filterRows(this.value)"><select onchange="filterRows(document.querySelector(\'.search\').value,this.value)"><option value="">All domains</option>'+vm.domains.map(d=>'<option>'+esc(d.name)+'</option>').join('')+'</select></div><span class="count" id="visibleCount"></span></div>'}
function renderServices(){const rows=vm.services.map(s=>'<tr data-search="'+esc((s.name+' '+s.domainName+' '+s.owner).toLowerCase())+'" data-domain="'+esc(s.domainName)+'"><td><button class="link" onclick="openService(\''+s.id+'\')">'+esc(s.name)+'</button><div class="sub">'+esc(s.description)+'</div></td><td>'+esc(s.domainName)+'</td><td>'+esc(s.owner||'Unassigned')+'</td><td>'+s.offeringCount+'</td><td>'+tag(s.lifecycle)+'</td><td>'+tag(s.validationStatus)+'</td></tr>');return hero('PORTFOLIO INVENTORY','Services','Managed capabilities organized under the four strategic domains.')+'<section class="panel tablePanel">'+toolbar('services')+table(['Service','Domain','Owner','Offerings','Lifecycle','Validation'],rows).replace('<section class="panel tablePanel">','').replace('</section>','')+'</section>'}
function renderOfferings(){const rows=vm.offerings.map(o=>{const a=latest(o);return '<tr data-search="'+esc((o.name+' '+o.serviceName+' '+o.domainName+' '+o.owner).toLowerCase())+'" data-domain="'+esc(o.domainName)+'"><td><button class="link" onclick="openOffering(\''+o.id+'\')">'+esc(o.name)+'</button><div class="sub">'+esc(o.serviceName)+'</div></td><td>'+esc(o.domainName)+'</td><td>'+health(a.health)+'</td><td>'+tag(a.maturity)+'</td><td>'+tag(a.direction)+'</td><td>'+synthetic(a)+'</td><td>'+o.products.length+'</td></tr>'});return hero('PORTFOLIO INVENTORY','Service Offerings','Discrete outcomes consumed by employees and business teams.')+'<section class="panel tablePanel">'+toolbar('offerings')+table(['Offering','Domain','Health','Maturity','Direction','Evidence state','Products'],rows).replace('<section class="panel tablePanel">','').replace('</section>','')+'</section>'}
function renderProducts(){const rows=vm.products.map(p=>'<tr data-search="'+esc((p.name+' '+p.vendor+' '+p.primaryDomainId).toLowerCase())+'"><td><button class="link" onclick="openProduct(\''+p.id+'\')">'+esc(p.name)+'</button></td><td>'+esc(p.vendor||'Unknown')+'</td><td>'+tag(p.lifecycle)+'</td><td>'+p.offerings.length+'</td><td>'+tag(p.validationStatus)+'</td><td>'+esc(p.evidence||'')+'</td></tr>');return hero('TECHNOLOGY PORTFOLIO','Products & Systems','Technology platforms, applications, modules, and internal systems that enable portfolio offerings.')+'<section class="panel tablePanel">'+toolbar('products')+table(['Product / System','Vendor','Lifecycle','Mapped offerings','Validation','Evidence basis'],rows).replace('<section class="panel tablePanel">','').replace('</section>','')+'</section>'}
function renderRelationships(){const byOffering=new Map(vm.offerings.map(o=>[o.id,o])),byProduct=new Map(vm.products.map(p=>[p.id,p]));const rows=vm.relationships.map(r=>{const o=byOffering.get(r.offeringId),p=byProduct.get(r.productId);return '<tr data-search="'+esc(((o?.name||'')+' '+(p?.name||'')+' '+r.role+' '+r.confidence).toLowerCase())+'"><td>'+esc(o?.name||r.offeringId)+'<div class="sub">'+esc(o?.serviceName||'')+'</div></td><td>'+esc(p?.name||r.productId)+'</td><td>'+tag(r.role)+'</td><td>'+tag(r.confidence)+'</td><td>'+tag(r.status)+'</td><td>'+health(r.health)+'</td><td>'+tag(r.validationStatus)+'</td></tr>'});return hero('CONNECT','Offering–Product Map','Shows why a product is connected to an offering, the confidence in that mapping, and the health of the relationship.')+'<section class="panel tablePanel">'+toolbar('relationships')+table(['Offering','Product / System','Relationship role','Confidence','Status','Relationship health','Validation'],rows).replace('<section class="panel tablePanel">','').replace('</section>','')+'</section>'}
function renderAssessments(){const offeringById=new Map(vm.offerings.map(o=>[o.id,o]));const rows=[...vm.assessments].sort((a,b)=>String(b.assessmentDate).localeCompare(String(a.assessmentDate))).map(a=>{const o=offeringById.get(a.entityId);return '<tr data-search="'+esc(((o?.name||'')+' '+a.health+' '+a.maturity+' '+a.direction+' '+a.status).toLowerCase())+'"><td>'+esc(o?.name||a.entityId)+'<div class="sub">'+esc(o?.serviceName||'')+'</div></td><td>'+esc(a.assessmentDate||'')+'</td><td>'+health(a.health)+'</td><td>'+tag(a.maturity)+'</td><td>'+tag(a.direction)+'</td><td>'+tag(a.risk)+'</td><td>'+tag(a.strategicFit)+'</td><td>'+synthetic(a)+tag(a.status)+'</td></tr>'});return hero('ASSESS','Assessments','Point-in-time records covering health, maturity, direction, lifecycle, risk, cost, strategic fit, evidence, outcomes, and recommended action.')+'<section class="panel tablePanel">'+toolbar('assessments')+table(['Offering','Date','Health','Maturity','Direction','Risk','Strategic fit','State'],rows).replace('<section class="panel tablePanel">','').replace('</section>','')+'</section>'}

function renderWorkspace(){
  return hero('ASSESSMENT WORKSPACE','Assess an offering','Create a new point-in-time assessment without overwriting assessment history.','Assessments are stored in SQLite. Local data survives app restarts. EasyDeploy persistence still requires the platform to mount persistent storage at /data.')+
  '<section class="workspaceGrid">'+
    '<div class="panel formPanel"><div class="eyebrow">SELECT OFFERING</div><h2 style="margin-top:0">Assessment target</h2><div class="field"><label>Service offering</label><select id="assessmentOffering" onchange="loadAssessmentTarget()"><option value="">Choose an offering…</option>'+vm.offerings.map(o=>'<option value="'+esc(o.id)+'">'+esc(o.domainName+' / '+o.serviceName+' / '+o.name)+'</option>').join('')+'</select></div><div id="assessmentContext" class="summary">Select an offering to see its current assessment and history.</div></div>'+
    '<div class="panel formPanel"><div id="workspaceMessage"></div><div class="eyebrow">NEW ASSESSMENT</div><h2 style="margin-top:0">Point-in-time assessment</h2>'+assessmentForm()+'</div>'+
  '</section>';
}
function assessmentForm(){
  const field=(id,label,options)=>'<div class="field"><label>'+esc(label)+'</label><select id="'+id+'"><option value="">Select…</option>'+options.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></div>';
  return '<div class="twoCol">'+field('assessmentHealth','Health',['green','yellow','red'])+field('assessmentMaturity','Maturity',['Emerging','Developing','Established','Leading'])+field('assessmentDirection','Direction',['Invest','Improve','Maintain','Consolidate','Retire'])+field('assessmentRisk','Risk',['Low','Moderate','High','Critical','Unknown'])+field('assessmentCost','Cost signal',['Low','Moderate','High','Unknown'])+field('assessmentFit','Strategic fit',['Low','Moderate','High','Unknown'])+'</div>'+field('assessmentLifecycle','Lifecycle',['Proposed','Active','Changing','Retiring','Retired'])+'<div class="field"><label>Assessment summary</label><textarea id="assessmentSummary" placeholder="What is the management assessment and why?"></textarea></div><div class="field"><label>Evidence</label><textarea id="assessmentEvidence" placeholder="Evidence, measures, source information, or observations supporting the assessment"></textarea></div><div class="field"><label>Risks</label><textarea id="assessmentRisks" placeholder="Material risks, constraints, or dependencies"></textarea></div><div class="field"><label>Measurable outcomes</label><textarea id="assessmentOutcomes" placeholder="What measurable outcome would show improvement or success?"></textarea></div><div class="field"><label>Recommended actions</label><textarea id="assessmentActions" placeholder="What should happen next?"></textarea></div><div class="twoCol"><div class="field"><label>Owner</label><input id="assessmentOwner" placeholder="Accountable owner"></div><div class="field"><label>Assessor</label><input id="assessmentAssessor" placeholder="Assessment completed by"></div></div><div class="formActions"><button class="ghost" onclick="clearAssessmentForm()">Clear</button><button class="save" onclick="submitAssessment()">Save assessment</button></div>';
}
function loadAssessmentTarget(){
  const id=document.getElementById('assessmentOffering').value;
  const o=vm.offerings.find(x=>x.id===id);
  const box=document.getElementById('assessmentContext');
  if(!o){box.innerHTML='Select an offering to see its current assessment and history.';return;}
  const history=vm.assessments.filter(a=>a.entityId===id).sort((a,b)=>String(b.assessmentDate).localeCompare(String(a.assessmentDate)));
  const current=o.assessment||{};
  document.getElementById('assessmentOwner').value=o.owner||'';
  box.innerHTML='<p><strong>'+esc(o.name)+'</strong><br>'+esc(o.domainName)+' / '+esc(o.serviceName)+'</p><p>Current: '+health(current.health)+' '+tag(current.maturity)+' '+tag(current.direction)+' '+synthetic(current)+'</p><div class="eyebrow" style="margin-top:18px">HISTORY</div>'+(history.length?history.map(a=>'<div class="historyItem"><strong>'+esc(a.assessmentDate||'Undated')+'</strong><div>'+health(a.health)+' '+tag(a.maturity)+' '+tag(a.direction)+' '+synthetic(a)+'</div><div class="summary">'+esc(a.summary||'No summary')+'</div></div>').join(''):'<p class="summary">No assessments found.</p>');
}
function clearAssessmentForm(){['assessmentHealth','assessmentMaturity','assessmentDirection','assessmentRisk','assessmentCost','assessmentFit','assessmentLifecycle'].forEach(id=>document.getElementById(id).value='');['assessmentSummary','assessmentEvidence','assessmentRisks','assessmentOutcomes','assessmentActions','assessmentAssessor'].forEach(id=>document.getElementById(id).value='');document.getElementById('workspaceMessage').innerHTML='';}
async function submitAssessment(){
  const offeringId=document.getElementById('assessmentOffering').value;
  const required=['assessmentHealth','assessmentMaturity','assessmentDirection'];
  if(!offeringId||required.some(id=>!document.getElementById(id).value)){document.getElementById('workspaceMessage').innerHTML='<div class="warningBox">Choose an offering and complete Health, Maturity, and Direction.</div>';return;}
  const payload={entityId:offeringId,health:document.getElementById('assessmentHealth').value,maturity:document.getElementById('assessmentMaturity').value,direction:document.getElementById('assessmentDirection').value,risk:document.getElementById('assessmentRisk').value||'Unknown',costSignal:document.getElementById('assessmentCost').value||'Unknown',strategicFit:document.getElementById('assessmentFit').value||'Unknown',lifecycle:document.getElementById('assessmentLifecycle').value||'Active',summary:document.getElementById('assessmentSummary').value,evidence:document.getElementById('assessmentEvidence').value,risks:document.getElementById('assessmentRisks').value,measurableOutcomes:document.getElementById('assessmentOutcomes').value,recommendedActions:document.getElementById('assessmentActions').value,owner:document.getElementById('assessmentOwner').value,assessor:document.getElementById('assessmentAssessor').value};
  const response=await fetch('/api/assessments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const result=await response.json();
  if(!response.ok){document.getElementById('workspaceMessage').innerHTML='<div class="warningBox">'+esc(result.error||'Unable to save assessment')+'</div>';return;}
  vm=await fetch('/api/view-model').then(r=>r.json());
  document.getElementById('workspaceMessage').innerHTML='<div class="successBox">Assessment saved to SQLite.</div>';
  clearAssessmentForm();
  document.getElementById('workspaceMessage').innerHTML='<div class="successBox">Assessment saved to SQLite.</div>';
  loadAssessmentTarget();
}

function renderQuality(){const v=vm.validation;return hero('DATA FOUNDATION','Data Quality','Make gaps visible before portfolio information is used for decisions.')+'<section class="twoCol"><div class="panel quality"><div class="eyebrow">VALIDATION</div><h2>'+(v.valid?'Data model is structurally valid':'Structural errors found')+'</h2><ul>'+(v.errors.length?v.errors.map(x=>'<li>'+esc(x)+'</li>').join(''):'<li>No structural errors detected.</li>')+'</ul></div><div class="panel quality"><div class="eyebrow">WARNINGS</div><h2>'+v.warnings.length+' warning(s)</h2><ul>'+(v.warnings.length?v.warnings.map(x=>'<li>'+esc(x)+'</li>').join(''):'<li>No warnings.</li>')+'</ul></div><div class="panel quality"><div class="eyebrow">PROVENANCE</div><h2>Source transparency</h2><ul><li>Monday: current board inventory</li><li>Other Agent: additional discoveries</li><li>Both: confirmed in both working models</li><li>Proposed: requires owner review</li></ul></div><div class="panel quality"><div class="eyebrow">ASSESSMENT STATUS</div><h2>Coverage controls</h2><ul><li>'+vm.coverage.validated+' validated</li><li>'+vm.coverage.synthetic+' synthetic demo</li><li>'+vm.coverage.missing+' missing</li><li>'+vm.coverage.needsReview+' offerings need review</li></ul></div></section>'}
function openDomain(id){const d=vm.domains.find(x=>x.id===id);if(!d)return;setNav('');document.getElementById('crumb').textContent='Portfolio / '+d.name;document.getElementById('content').innerHTML='<div class="detailTop"><button class="back" onclick="showPage(\'overview\')">← Overview</button></div><section class="detailHero"><div><div class="eyebrow">STRATEGIC DOMAIN</div><h1>'+esc(d.name)+'</h1><p>'+esc(d.description)+'</p></div><div class="score"><div><label>Services</label><strong>'+d.serviceCount+'</strong></div><div><label>Offerings</label><strong>'+d.offeringCount+'</strong></div><div><label>Validation</label>'+tag(d.validationStatus)+'</div></div></section>'+d.services.map(s=>'<section class="serviceBlock"><div class="serviceTitle"><div><div class="eyebrow">SERVICE</div><h3>'+esc(s.name)+'</h3></div><button class="link" onclick="openService(\''+s.id+'\')">'+s.offeringCount+' offerings →</button></div><div class="offeringGrid">'+s.offerings.map(offeringCard).join('')+'</div></section>').join('');window.scrollTo({top:0})}
function offeringCard(o){const a=latest(o);return '<article class="card offering"><div>'+health(a.health)+' '+synthetic(a)+'</div><h4><button class="link" onclick="openOffering(\''+o.id+'\')">'+esc(o.name)+'</button></h4><div class="assessmentMeta"><div><label>Maturity</label><strong>'+esc(a.maturity||'Unknown')+'</strong></div><div><label>Direction</label><strong>'+esc(a.direction||'Unknown')+'</strong></div><div><label>Products</label><strong>'+o.products.length+'</strong></div></div><div>'+o.products.slice(0,4).map(p=>'<span class="productChip">'+esc(p.name)+'</span>').join('')+'</div></article>'}
function openService(id){const s=vm.services.find(x=>x.id===id);if(!s)return;const d=vm.domains.find(x=>x.id===s.domainId);document.getElementById('content').innerHTML='<div class="detailTop"><button class="back" onclick="showPage(\'services\')">← Services</button><button class="back" onclick="openDomain(\''+s.domainId+'\')">'+esc(d?.name||'Domain')+'</button></div>'+hero('SERVICE',s.name,s.description)+'<div class="offeringGrid">'+s.offerings.map(offeringCard).join('')+'</div>';window.scrollTo({top:0})}
function openOffering(id){const o=vm.offerings.find(x=>x.id===id);if(!o)return;const a=latest(o);document.getElementById('content').innerHTML='<div class="detailTop"><button class="back" onclick="showPage(\'offerings\')">← Offerings</button><button class="back" onclick="openService(\''+o.serviceId+'\')">'+esc(o.serviceName)+'</button></div>'+hero('SERVICE OFFERING',o.name,(o.description||'No validated description yet.'),'This record is '+(a.syntheticDemo?'a synthetic demo assessment.':'not marked synthetic.'))+'<section class="metrics">'+metric(esc(a.health||'Unknown'),'Health','Current assessment')+metric(esc(a.maturity||'Unknown'),'Maturity','Capability maturity')+metric(esc(a.direction||'Unknown'),'Direction','Management choice')+metric(esc(a.risk||'Unknown'),'Risk','Assessment signal')+metric(o.products.length,'Products','Enabling relationships')+'</section><section class="twoCol"><div class="panel quality"><div class="eyebrow">ASSESSMENT</div><h2>Latest assessment</h2><p class="summary">'+esc(a.summary||'No assessment summary.')+'</p><div class="tags">'+tag(a.status)+tag(a.strategicFit)+tag(a.costSignal)+synthetic(a)+'</div></div><div class="panel quality"><div class="eyebrow">ENABLING TECHNOLOGY</div><h2>Offering–product relationships</h2>'+(o.products.length?o.products.map(p=>'<p><button class="link" onclick="openProduct(\''+p.id+'\')">'+esc(p.name)+'</button><br><span class="sub">'+esc(p.relationship.role)+' • '+esc(p.relationship.confidence)+' confidence</span></p>').join(''):'<p class="summary">No product relationship has been mapped.</p>')+'</div></section>';window.scrollTo({top:0})}
function openProduct(id){const p=vm.products.find(x=>x.id===id);if(!p)return;document.getElementById('content').innerHTML='<div class="detailTop"><button class="back" onclick="showPage(\'products\')">← Products</button></div>'+hero('PRODUCT / SYSTEM',p.name,p.description||'No validated product description yet.')+'<section class="metrics">'+metric(esc(p.vendor||'Unknown'),'Vendor','Supplier or source')+metric(esc(p.lifecycle),'Lifecycle','Current state')+metric(p.offerings.length,'Offerings','Mapped relationships')+metric(esc(p.validationStatus),'Validation','Evidence status')+metric(esc(p.source),'Source','Record provenance')+'</section>'+table(['Offering','Service','Domain','Role','Confidence'],p.offerings.map(o=>'<tr><td><button class="link" onclick="openOffering(\''+o.id+'\')">'+esc(o.name)+'</button></td><td>'+esc(o.serviceName)+'</td><td>'+esc(o.domainName)+'</td><td>'+tag(o.relationship.role)+'</td><td>'+tag(o.relationship.confidence)+'</td></tr>'));window.scrollTo({top:0})}
function filterRows(query,domain=''){query=(query||'').toLowerCase();const rows=[...document.querySelectorAll('tbody tr')];let n=0;rows.forEach(r=>{const ok=(!query||r.dataset.search?.includes(query))&&(!domain||r.dataset.domain===domain);r.classList.toggle('hidden',!ok);if(ok)n++});const c=document.getElementById('visibleCount');if(c)c.textContent=n+' visible'}
fetch('/api/view-model').then(r=>{if(!r.ok)throw new Error('API returned '+r.status);return r.json()}).then(data=>{vm=data;showPage('overview')}).catch(err=>{document.getElementById('content').innerHTML='<div class="notice">Unable to load portfolio: '+esc(err.message)+'</div>'});
</script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  if (path === '/healthz') return sendJson(res, 200, { status: 'ok', service: SERVICE_NAME });
  if (path === '/api/portfolio') return sendJson(res, 200, portfolio);
  if (path === '/api/view-model') return sendJson(res, 200, buildViewModel());
  if (path === '/api/summary') {
    const vm = buildViewModel();
    return sendJson(res, 200, {
      domains: vm.domains.length,
      services: vm.services.length,
      offerings: vm.offerings.length,
      products: vm.products.length,
      relationships: vm.relationships.length,
      assessments: vm.assessments.length,
      coverage: vm.coverage
    });
  }
  if (path === '/api/services') return sendJson(res, 200, buildViewModel().services);
  if (path === '/api/offerings') return sendJson(res, 200, buildViewModel().offerings);
  if (path === '/api/products') return sendJson(res, 200, buildViewModel().products);
  if (path === '/api/relationships') return sendJson(res, 200, portfolio.relationships);

  if (path === '/api/assessments' && req.method === 'POST') {
    return readJsonBody(req).then(data => {
      const offering = portfolio.offerings.find(item => item.id === data.entityId);
      if (!offering) return sendJson(res, 400, { error: 'A valid service offering is required.' });
      if (!['green','yellow','red'].includes(data.health)) return sendJson(res, 400, { error: 'Health must be green, yellow, or red.' });
      if (!['Emerging','Developing','Established','Leading'].includes(data.maturity)) return sendJson(res, 400, { error: 'A valid maturity is required.' });
      if (!['Invest','Improve','Maintain','Consolidate','Retire'].includes(data.direction)) return sendJson(res, 400, { error: 'A valid direction is required.' });
      const now = new Date();
      const assessment = {
        id: 'assessment-' + data.entityId + '-' + now.getTime(),
        entityType: 'offering', entityId: data.entityId,
        assessmentDate: now.toISOString().slice(0,10),
        health: data.health, maturity: data.maturity, direction: data.direction,
        lifecycle: data.lifecycle || 'Active', risk: data.risk || 'Unknown',
        costSignal: data.costSignal || 'Unknown', strategicFit: data.strategicFit || 'Unknown',
        summary: data.summary || '', evidence: data.evidence || '', risks: data.risks || '',
        measurableOutcomes: data.measurableOutcomes || '', recommendedActions: data.recommendedActions || '',
        owner: data.owner || offering.owner || '', assessor: data.assessor || '',
        status: 'Submitted', syntheticDemo: false, source: 'Proposed'
      };
      const saved = store.createAssessment(assessment);
      return sendJson(res, 201, saved);
    }).catch(error => sendJson(res, 400, { error: error.message || 'Invalid request.' }));
  }

  if (path === '/api/assessments') return sendJson(res, 200, allAssessments());
  if (path === '/api/data-quality') return sendJson(res, 200, validation);
  if (path === '/api/storage') return sendJson(res, 200, store.storageInfo());
  if (path === '/api/export/assessments') return sendJson(res, 200, { exportedAt: new Date().toISOString(), assessments: allAssessments() });

  if (path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(HTML);
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

process.on('SIGTERM', () => { store.close(); process.exit(0); });
process.on('SIGINT', () => { store.close(); process.exit(0); });

server.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({
    level: 'info',
    message: 'Enterprise Services Portfolio started',
    service: SERVICE_NAME,
    port: PORT,
    domains: portfolio.domains.length,
    services: portfolio.services.length,
    offerings: portfolio.offerings.length,
    products: portfolio.products.length
  }));
});
