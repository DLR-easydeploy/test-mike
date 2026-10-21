const {
  createAssessment,
  createRelationship,
  validatePortfolio
} = require('./model');

const domains = [
  { id: 'employee-platforms', name: 'Employee Platforms', description: 'Employee lifecycle, workforce, talent, integration, data, adoption, automation, and internal application capabilities.', source: 'Both', validationStatus: 'Needs Review' },
  { id: 'identity-access', name: 'Identity & Access', description: 'Identity lifecycle, authentication, access management, and identity governance capabilities.', source: 'Both', validationStatus: 'Needs Review' },
  { id: 'end-user-services', name: 'End User Services', description: 'Endpoint, collaboration, workplace access, and digital employee experience capabilities.', source: 'Both', validationStatus: 'Needs Review' },
  { id: 'enterprise-service-management', name: 'Enterprise Service Management', description: 'Support, service management, configuration, knowledge, request, incident, change, and technology asset capabilities.', source: 'Both', validationStatus: 'Needs Review' }
];

const services = [
  ['workforce-administration','Workforce Administration','employee-platforms','Core workforce processes including worker records, payroll, benefits, time, absence, workforce structures, and country enablement.','Mike Wolfe','Monday'],
  ['talent-rewards','Talent & Rewards','employee-platforms','Talent acquisition, onboarding, performance, compensation, talent reviews, succession, skills, and careers.','Mike Wolfe','Monday'],
  ['employee-technology-engineering','Employee Technology Engineering','employee-platforms','Engineering for employee platforms, including integrations, reporting, data quality, testing, releases, and environments.','Mike Wolfe','Monday'],
  ['automation-integration-engineering','Automation & Integration Engineering','employee-platforms','Workflow automation, AI-enabled employee services, self-service, and cross-platform employee experiences.','','Monday'],
  ['digital-adoption','Digital Adoption','employee-platforms','Adoption analytics, communications, enablement, training, and value realization for enterprise platforms.','','Monday'],
  ['business-application-services','Business Application Services','employee-platforms','Provide and support internal applications used by Operations and adjacent business functions.','','Monday'],
  ['internal-application-services','Internal Application Services','employee-platforms','Provide and support purpose-built internal applications and web services.','','Both'],
  ['employee-digital-experience','Employee Digital Experience','employee-platforms','Provide employee-facing digital destinations and focused employee applications.','','Monday'],
  ['internal-integration-services','Internal Integration Services','employee-platforms','Provide and operate purpose-built integrations outside the HR-specific integration offering.','','Both'],
  ['identity-lifecycle','Identity Lifecycle','identity-access','Identity creation, changes, provisioning, deprovisioning, and lifecycle events for employees and contingent workers.','Bala Kamat','Monday'],
  ['authentication-sso','Authentication & Single Sign-On','identity-access','Authentication standards and single sign-on experiences for enterprise applications.','Bala Kamat','Monday'],
  ['access-management','Access Management','identity-access','Access request, approval, provisioning, removal, and entitlement management.','Bala Kamat','Monday'],
  ['identity-governance','Identity Governance','identity-access','Access governance, certifications, policy controls, and identity compliance.','Bala Kamat','Monday'],
  ['endpoint-device-services','Endpoint & Device Services','end-user-services','Manage employee endpoints across provisioning, configuration, updates, lifecycle, virtual desktop, and device experience.','Steven Davis','Both'],
  ['collaboration-productivity','Collaboration & Productivity','end-user-services','Provide productivity, collaboration, messaging, telephony, and meeting-room capabilities.','Steven Davis','Both'],
  ['digital-workplace-access','Digital Workplace Access','end-user-services','Provide secure, role-appropriate access to workplace technology for employees and contingent workers.','Steven Davis','Both'],
  ['digital-employee-experience-management','Digital Employee Experience Management','end-user-services','Measure and improve employee experience across devices, applications, networks, collaboration tools, and support interactions.','Steven Davis','Both'],
  ['service-management-platform','Service Management Platform','enterprise-service-management','Provide and govern the shared platform capabilities used to manage enterprise technology services.','Chris Jeffers','Monday'],
  ['service-knowledge-self-service','Service Knowledge & Self-Service','enterprise-service-management','Provide usable service knowledge, guidance, self-help, and digital entry points for support and requests.','Chris Jeffers','Monday'],
  ['service-request-management','Service Request Management','enterprise-service-management','Manage and fulfill standard requests for technology, access, information, and services.','Chris Jeffers','Monday'],
  ['it-support','IT Support','enterprise-service-management','Help users resolve technology issues and restore productive use of enterprise technology.','Chris Jeffers','Monday'],
  ['incident-management','Incident Management','enterprise-service-management','Coordinate restoration of service following unplanned interruptions or degradation.','','Monday'],
  ['change-enablement','Change Enablement','enterprise-service-management','Assess, coordinate, approve, and communicate changes to enterprise technology services.','','Monday'],
  ['configuration-management','Configuration Management','enterprise-service-management','Maintain trustworthy configuration information and relationships for services, applications, infrastructure, and technology assets.','','Both'],
  ['technology-asset-management','Technology Asset Management','enterprise-service-management','Manage the financial, contractual, operational, and lifecycle accountability of hardware and other technology assets.','','Both'],
  ['software-asset-management','Software Asset Management','enterprise-service-management','Manage software and SaaS inventory, entitlements, usage, spend, renewals, compliance, optimization, and lifecycle decisions.','','Both']
].map(([id,name,domainId,description,owner,source]) => ({
  id, name, domainId, description, owner, source,
  lifecycle: 'Proposed', validationStatus: 'Needs Review', evidence: ''
}));

const offeringSpecs = [
  ['workforce-administration',['Core HR Administration','Payroll Administration','Benefits Administration','Time and Labor','Absence Management','Workforce Structures','Country Enablement']],
  ['talent-rewards',['Recruiting','Employee Onboarding','Performance Management','Compensation Management','Talent Reviews and Succession','Learning Management','Skills and Career Development']],
  ['employee-technology-engineering',['HR Integrations','HR Reporting and Data Products','HR Data Quality','HR Release and Environment Management','HR Testing and Validation']],
  ['automation-integration-engineering',['Employee Workflow Automation','Employee Self-Service Experiences','HR Case and Request Experiences','AI-Enabled Employee Assistance','Electronic Signature Enablement']],
  ['digital-adoption',['Platform Adoption Analytics','Platform Communications and Training','Adoption Campaigns and In-App Guidance','Value Realization']],
  ['business-application-services',['Operations Productivity Applications','Vacant and Incoming Inventory Analysis','Network Equipment Inventory Tracking','Network Bill of Materials Management','Market and Portfolio Intelligence']],
  ['internal-application-services',['Purpose-Built Internal Applications','Internal Web Services','Employee Charitable Matching','Security Guard Operations Integration']],
  ['employee-digital-experience',['Employee Portal and Homepage','Focused Employee Applications']],
  ['internal-integration-services',['Treasury Rate Integration','Project Document Synchronization','Expense File Processing and Reporting']],
  ['identity-lifecycle',['Identity Creation and Provisioning','Joiner Mover Leaver Automation','Identity Deprovisioning','Contingent Worker Identity Lifecycle']],
  ['authentication-sso',['Enterprise Authentication','Single Sign-On','Multi-Factor Authentication','Passwordless Authentication']],
  ['access-management',['Access Requests and Approval','Entitlement Provisioning','Access Removal','Privileged Access Coordination']],
  ['identity-governance',['Access Certification','Identity Policy Controls','Identity Compliance Reporting']],
  ['endpoint-device-services',['Device Provisioning and Enrollment','Endpoint Management','Device Lifecycle Management','Operating System and Application Updates','Virtual Desktop Services','Endpoint Support']],
  ['collaboration-productivity',['Productivity Platform Services','Messaging and Collaboration','Enterprise Telephony','Meeting and Conference Room Technology']],
  ['digital-workplace-access',['Secure Browser Access','Remote Desktop Access','Contingent Worker Technology Access']],
  ['digital-employee-experience-management',['Digital Experience Monitoring','Proactive Experience Remediation','Employee Technology Sentiment and Experience Insights']],
  ['service-management-platform',['Service Management Platform Administration','Service Catalog Platform Enablement','Service Management Reporting']],
  ['service-knowledge-self-service',['Knowledge Publishing','Employee Self-Help','Digital Support Entry Points']],
  ['service-request-management',['Service Request Intake','Request Approval and Fulfillment','Request Catalog Management']],
  ['it-support',['Service Desk Support','Technical Support Escalation','User Technology Assistance']],
  ['incident-management',['Incident Coordination','Major Incident Management','Service Restoration']],
  ['change-enablement',['Change Assessment and Approval','Change Scheduling and Coordination','Change Communications']],
  ['configuration-management',['Configuration Item Management','Configuration Data Quality','Service and Application Configuration Mapping','Configuration Lifecycle Governance']],
  ['technology-asset-management',['Technology Asset Inventory and Lifecycle','Asset Assignment and Recovery','Asset Compliance and Reconciliation','Asset Financial and Contract Management','Asset Refresh and Disposition']],
  ['software-asset-management',['Software and SaaS Inventory Discovery','SaaS Spend and Renewal Management','Software Usage and License Optimization','Software Entitlement and Compliance Management','Software Lifecycle and Rationalization']]
];

function slug(value) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const serviceById = new Map(services.map(x => [x.id, x]));
const offerings = offeringSpecs.flatMap(([serviceId,names]) => names.map(name => {
  const service = serviceById.get(serviceId);
  return {
    id: `${serviceId}-${slug(name)}`,
    name,
    serviceId,
    description: '',
    owner: service.owner,
    lifecycle: 'Proposed',
    source: 'Both',
    validationStatus: 'Needs Review',
    evidence: ''
  };
}));

const productSpecs = [
  ['oracle-fusion-cloud-hcm','Oracle Fusion Cloud HCM','Oracle','employee-platforms'],
  ['oracle-integration-cloud','Oracle Integration Cloud','Oracle','employee-platforms'],
  ['workato','Workato','Workato','employee-platforms'],
  ['microsoft-power-platform','Microsoft Power Platform','Microsoft','employee-platforms'],
  ['microsoft-copilot-studio','Microsoft Copilot Studio','Microsoft','employee-platforms'],
  ['microsoft-fabric','Microsoft Fabric','Microsoft','employee-platforms'],
  ['power-bi','Power BI','Microsoft','employee-platforms'],
  ['absorb-lms','Absorb LMS','Absorb Software','employee-platforms'],
  ['linkedin-learning','LinkedIn Learning','LinkedIn','employee-platforms'],
  ['sap-concur','SAP Concur Travel & Expense','SAP Concur','employee-platforms'],
  ['walkme','WalkMe','WalkMe','employee-platforms'],
  ['docusign','DocuSign eSignature','DocuSign','employee-platforms'],
  ['sharepoint-online','SharePoint Online','Microsoft','employee-platforms'],
  ['connection-homepage','Connection / Homepage','Internal / Microsoft','employee-platforms'],
  ['microsoft-entra-id','Microsoft Entra ID','Microsoft','identity-access'],
  ['microsoft-entra-governance','Microsoft Entra ID Governance','Microsoft','identity-access'],
  ['active-directory-domain-services','Active Directory Domain Services','Microsoft','identity-access'],
  ['sailpoint','SailPoint','SailPoint','identity-access'],
  ['microsoft-authenticator','Microsoft Authenticator','Microsoft','identity-access'],
  ['windows-hello-business','Windows Hello for Business','Microsoft','identity-access'],
  ['atlassian-guard','Atlassian Guard','Atlassian','identity-access'],
  ['microsoft-intune','Microsoft Intune','Microsoft','end-user-services'],
  ['microsoft-configuration-manager','Microsoft Configuration Manager','Microsoft','end-user-services'],
  ['microsoft-365','Microsoft 365','Microsoft','end-user-services'],
  ['microsoft-teams','Microsoft Teams','Microsoft','end-user-services'],
  ['viva-engage','Viva Engage','Microsoft','end-user-services'],
  ['slack-enterprise-grid','Slack Enterprise Grid','Salesforce / Slack','end-user-services'],
  ['nexthink','Nexthink','Nexthink','end-user-services'],
  ['servicenow','ServiceNow','ServiceNow','enterprise-service-management'],
  ['servicenow-privacy-management','ServiceNow Privacy Management','ServiceNow','enterprise-service-management'],
  ['jira','Jira','Atlassian','enterprise-service-management'],
  ['jira-service-management','Jira Service Management','Atlassian','enterprise-service-management'],
  ['confluence','Confluence','Atlassian','enterprise-service-management'],
  ['monday-com','Monday.com','monday.com','enterprise-service-management'],
  ['smartsheet','Smartsheet','Smartsheet','enterprise-service-management'],
  ['smartsheet-control-center','Smartsheet Control Center','Smartsheet','enterprise-service-management'],
  ['zylo','Zylo','Zylo','enterprise-service-management'],
  ['mircat','MIRCAT','Internal','employee-platforms'],
  ['dlr-ops-portal','DLR Ops Portal','Internal','employee-platforms'],
  ['inventory-management','Inventory Management','Internal','employee-platforms'],
  ['bom','BOM (Bill of Materials)','Internal','employee-platforms'],
  ['biz-dmz-web-service','Biz-DMZ Web Service','Internal','employee-platforms'],
  ['matching-charity','Matching Charity','Internal','employee-platforms'],
  ['market-intelligence','Market Intelligence v1.0','Internal','employee-platforms'],
  ['network-observability-portal','Network Observability Portal (NOP)','Internal','enterprise-service-management'],
  ['procore-sharepoint-sync','Procore-SharePoint Sync Engine','Internal','employee-platforms']
];

const products = productSpecs.map(([id,name,vendor,primaryDomainId]) => ({
  id, name, vendor, primaryDomainId, description: '', owner: '', lifecycle: 'Proposed',
  source: 'Both', validationStatus: 'Needs Review', evidence: 'Portfolio context - validate'
}));

const relationshipSpecs = [
  ['hr-integrations','employee-technology-engineering-hr-integrations','oracle-integration-cloud','Primary platform','High'],
  ['hr-integrations-hcm','employee-technology-engineering-hr-integrations','oracle-fusion-cloud-hcm','Source/target system','High'],
  ['hr-reporting-fabric','employee-technology-engineering-hr-reporting-and-data-products','microsoft-fabric','Primary data platform','Medium'],
  ['hr-reporting-powerbi','employee-technology-engineering-hr-reporting-and-data-products','power-bi','Reporting platform','High'],
  ['learning-absorb','talent-rewards-learning-management','absorb-lms','Primary platform','High'],
  ['learning-linkedin','talent-rewards-learning-management','linkedin-learning','Supporting platform','High'],
  ['adoption-walkme','digital-adoption-adoption-campaigns-and-in-app-guidance','walkme','Primary platform','High'],
  ['workflow-powerplatform','automation-integration-engineering-employee-workflow-automation','microsoft-power-platform','Primary enablement platform','High'],
  ['assistant-copilot','automation-integration-engineering-ai-enabled-employee-assistance','microsoft-copilot-studio','Primary platform','High'],
  ['esign-docusign','automation-integration-engineering-electronic-signature-enablement','docusign','Primary platform','High'],
  ['auth-entra','authentication-sso-enterprise-authentication','microsoft-entra-id','Primary platform','High'],
  ['mfa-authenticator','authentication-sso-multi-factor-authentication','microsoft-authenticator','Primary application','High'],
  ['passwordless-hello','authentication-sso-passwordless-authentication','windows-hello-business','Primary application','High'],
  ['governance-entra','identity-governance-access-certification','microsoft-entra-governance','Primary platform','High'],
  ['governance-sailpoint','identity-governance-access-certification','sailpoint','Primary platform','Medium'],
  ['endpoint-intune','endpoint-device-services-endpoint-management','microsoft-intune','Primary platform','High'],
  ['endpoint-configmgr','endpoint-device-services-endpoint-management','microsoft-configuration-manager','Supporting platform','High'],
  ['productivity-m365','collaboration-productivity-productivity-platform-services','microsoft-365','Primary platform','High'],
  ['collaboration-teams','collaboration-productivity-messaging-and-collaboration','microsoft-teams','Primary platform','High'],
  ['collaboration-slack','collaboration-productivity-messaging-and-collaboration','slack-enterprise-grid','Supporting platform','High'],
  ['dex-nexthink','digital-employee-experience-management-digital-experience-monitoring','nexthink','Potential monitoring/reconciliation platform','Medium'],
  ['itsm-servicenow','service-management-platform-service-management-platform-administration','servicenow','Primary platform','High'],
  ['request-servicenow','service-request-management-service-request-intake','servicenow','Primary platform','High'],
  ['knowledge-confluence','service-knowledge-self-service-knowledge-publishing','confluence','Knowledge platform','Medium'],
  ['sam-servicenow','software-asset-management-software-entitlement-and-compliance-management','servicenow','Managed platform/application','Medium'],
  ['sam-zylo','software-asset-management-saas-spend-and-renewal-management','zylo','Potential monitoring/reconciliation platform','Medium'],
  ['cmdb-servicenow','configuration-management-configuration-item-management','servicenow','Primary platform/module','High']
];

const relationships = relationshipSpecs.map(([id,offeringId,productId,role,confidence]) => createRelationship({
  id, offeringId, productId, role, confidence, status: 'Proposed', source: 'Both', validationStatus: 'Needs Review'
}));

const assessments = offerings.map((offering, index) => createAssessment({
  id: `assessment-${offering.id}-demo`,
  entityType: 'offering',
  entityId: offering.id,
  assessmentDate: '2026-10-21',
  health: index % 7 === 0 ? 'green' : 'yellow',
  maturity: index % 5 === 0 ? 'Established' : 'Developing',
  direction: index % 6 === 0 ? 'Invest' : index % 4 === 0 ? 'Maintain' : 'Improve',
  lifecycle: 'Proposed',
  risk: 'Unknown',
  costSignal: 'Unknown',
  strategicFit: 'Unknown',
  summary: 'Synthetic placeholder. Replace with validated owner input, evidence, risks, measurable outcomes, and recommended actions.',
  evidence: '', risks: '', measurableOutcomes: '', recommendedActions: '',
  owner: offering.owner, assessor: '', status: 'Draft', syntheticDemo: true, source: 'Proposed'
}));

const portfolio = {
  metadata: {
    name: 'Enterprise Services Portfolio V1',
    asOfDate: '2026-10-21',
    schemaVersion: 1,
    note: 'Combined Monday inventory and additional agent discoveries. Proposed and synthetic records require validation.'
  },
  domains,
  services,
  offerings,
  products,
  relationships,
  assessments,
  actions: []
};

const validation = validatePortfolio(portfolio);
if (!validation.valid) {
  throw new Error(`Portfolio data is invalid:\n${validation.errors.join('\n')}`);
}

module.exports = { portfolio, validation };
