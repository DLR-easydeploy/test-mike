const HEALTH_VALUES = ['green', 'yellow', 'red'];

const MATURITY_VALUES = [
  'Emerging',
  'Developing',
  'Established',
  'Leading'
];

const DIRECTION_VALUES = [
  'Invest',
  'Improve',
  'Maintain',
  'Consolidate',
  'Retire'
];

const VALIDATION_VALUES = [
  'Validated',
  'Needs Review',
  'Synthetic Demo',
  'Missing Assessment'
];

const SOURCE_VALUES = [
  'Monday',
  'Other Agent',
  'Both',
  'Proposed'
];

const ASSESSMENT_STATUS_VALUES = [
  'Draft',
  'Submitted',
  'Validated',
  'Superseded'
];

const RELATIONSHIP_ROLE_VALUES = [
  'Primary platform',
  'Primary application',
  'Primary platform/module',
  'Primary data platform',
  'Primary enablement platform',
  'Enablement platform',
  'Supporting platform',
  'Source system',
  'Source/target system',
  'Authoritative system',
  'Authoritative data source',
  'Reporting platform',
  'Content platform',
  'Knowledge platform',
  'Work management platform',
  'Portfolio platform',
  'System under test',
  'Managed platform',
  'Managed platform/application',
  'Potential monitoring/reconciliation platform'
];

const CONFIDENCE_VALUES = [
  'High',
  'Medium',
  'Low'
];

const LIFECYCLE_VALUES = [
  'Proposed',
  'Active',
  'Changing',
  'Retiring',
  'Retired'
];

const COST_SIGNAL_VALUES = [
  'Low',
  'Moderate',
  'High',
  'Unknown'
];

const STRATEGIC_FIT_VALUES = [
  'Low',
  'Moderate',
  'High',
  'Unknown'
];

const RISK_VALUES = [
  'Low',
  'Moderate',
  'High',
  'Critical',
  'Unknown'
];

function createAssessment({
  id,
  entityType = 'offering',
  entityId,
  assessmentDate,
  health,
  maturity,
  direction,
  lifecycle = 'Active',
  risk = 'Unknown',
  costSignal = 'Unknown',
  strategicFit = 'Unknown',
  summary = '',
  evidence = '',
  risks = '',
  measurableOutcomes = '',
  recommendedActions = '',
  owner = '',
  assessor = '',
  status = 'Draft',
  syntheticDemo = false,
  source = 'Proposed'
}) {
  return {
    id,
    entityType,
    entityId,
    assessmentDate,
    health,
    maturity,
    direction,
    lifecycle,
    risk,
    costSignal,
    strategicFit,
    summary,
    evidence,
    risks,
    measurableOutcomes,
    recommendedActions,
    owner,
    assessor,
    status,
    syntheticDemo,
    source
  };
}

function createRelationship({
  id,
  offeringId,
  productId,
  role,
  confidence = 'Medium',
  status = 'Proposed',
  health = null,
  fit = 'Unknown',
  owner = '',
  notes = '',
  evidence = '',
  source = 'Proposed',
  validationStatus = 'Needs Review'
}) {
  return {
    id,
    offeringId,
    productId,
    role,
    confidence,
    status,
    health,
    fit,
    owner,
    notes,
    evidence,
    source,
    validationStatus
  };
}

function validateChoice(name, value, allowedValues, errors) {
  if (value === null || value === undefined || value === '') {
    return;
  }

  if (!allowedValues.includes(value)) {
    errors.push(
      `${name} has invalid value "${value}". ` +
      `Allowed values: ${allowedValues.join(', ')}`
    );
  }
}

function validatePortfolio(portfolio) {
  const errors = [];
  const warnings = [];

  const ids = new Map();

  function registerId(type, record) {
    if (!record.id) {
      errors.push(`${type} record is missing an id.`);
      return;
    }

    if (ids.has(record.id)) {
      errors.push(
        `Duplicate id "${record.id}" used by ${type} and ${ids.get(record.id)}.`
      );
      return;
    }

    ids.set(record.id, type);
  }

  for (const domain of portfolio.domains || []) {
    registerId('domain', domain);

    validateChoice(
      `Domain ${domain.name} source`,
      domain.source,
      SOURCE_VALUES,
      errors
    );

    validateChoice(
      `Domain ${domain.name} validation status`,
      domain.validationStatus,
      VALIDATION_VALUES,
      errors
    );
  }

  for (const service of portfolio.services || []) {
    registerId('service', service);

    if (!ids.has(service.domainId)) {
      errors.push(
        `Service "${service.name}" references missing domain "${service.domainId}".`
      );
    }

    validateChoice(
      `Service ${service.name} lifecycle`,
      service.lifecycle,
      LIFECYCLE_VALUES,
      errors
    );

    validateChoice(
      `Service ${service.name} source`,
      service.source,
      SOURCE_VALUES,
      errors
    );

    validateChoice(
      `Service ${service.name} validation status`,
      service.validationStatus,
      VALIDATION_VALUES,
      errors
    );
  }

  for (const offering of portfolio.offerings || []) {
    registerId('offering', offering);

    const parentService = (portfolio.services || []).find(
      service => service.id === offering.serviceId
    );

    if (!parentService) {
      errors.push(
        `Offering "${offering.name}" references missing service ` +
        `"${offering.serviceId}".`
      );
    }

    validateChoice(
      `Offering ${offering.name} lifecycle`,
      offering.lifecycle,
      LIFECYCLE_VALUES,
      errors
    );

    validateChoice(
      `Offering ${offering.name} source`,
      offering.source,
      SOURCE_VALUES,
      errors
    );

    validateChoice(
      `Offering ${offering.name} validation status`,
      offering.validationStatus,
      VALIDATION_VALUES,
      errors
    );
  }

  for (const product of portfolio.products || []) {
    registerId('product', product);

    validateChoice(
      `Product ${product.name} lifecycle`,
      product.lifecycle,
      LIFECYCLE_VALUES,
      errors
    );

    validateChoice(
      `Product ${product.name} source`,
      product.source,
      SOURCE_VALUES,
      errors
    );

    validateChoice(
      `Product ${product.name} validation status`,
      product.validationStatus,
      VALIDATION_VALUES,
      errors
    );
  }

  for (const relationship of portfolio.relationships || []) {
    registerId('relationship', relationship);

    const offeringExists = (portfolio.offerings || []).some(
      offering => offering.id === relationship.offeringId
    );

    const productExists = (portfolio.products || []).some(
      product => product.id === relationship.productId
    );

    if (!offeringExists) {
      errors.push(
        `Relationship "${relationship.id}" references missing offering ` +
        `"${relationship.offeringId}".`
      );
    }

    if (!productExists) {
      errors.push(
        `Relationship "${relationship.id}" references missing product ` +
        `"${relationship.productId}".`
      );
    }

    validateChoice(
      `Relationship ${relationship.id} role`,
      relationship.role,
      RELATIONSHIP_ROLE_VALUES,
      errors
    );

    validateChoice(
      `Relationship ${relationship.id} confidence`,
      relationship.confidence,
      CONFIDENCE_VALUES,
      errors
    );

    validateChoice(
      `Relationship ${relationship.id} health`,
      relationship.health,
      HEALTH_VALUES,
      errors
    );
  }

  for (const assessment of portfolio.assessments || []) {
    registerId('assessment', assessment);

    validateChoice(
      `Assessment ${assessment.id} health`,
      assessment.health,
      HEALTH_VALUES,
      errors
    );

    validateChoice(
      `Assessment ${assessment.id} maturity`,
      assessment.maturity,
      MATURITY_VALUES,
      errors
    );

    validateChoice(
      `Assessment ${assessment.id} direction`,
      assessment.direction,
      DIRECTION_VALUES,
      errors
    );

    validateChoice(
      `Assessment ${assessment.id} lifecycle`,
      assessment.lifecycle,
      LIFECYCLE_VALUES,
      errors
    );

    validateChoice(
      `Assessment ${assessment.id} risk`,
      assessment.risk,
      RISK_VALUES,
      errors
    );

    validateChoice(
      `Assessment ${assessment.id} cost signal`,
      assessment.costSignal,
      COST_SIGNAL_VALUES,
      errors
    );

    validateChoice(
      `Assessment ${assessment.id} strategic fit`,
      assessment.strategicFit,
      STRATEGIC_FIT_VALUES,
      errors
    );

    validateChoice(
      `Assessment ${assessment.id} status`,
      assessment.status,
      ASSESSMENT_STATUS_VALUES,
      errors
    );

    if (!ids.has(assessment.entityId)) {
      errors.push(
        `Assessment "${assessment.id}" references missing entity ` +
        `"${assessment.entityId}".`
      );
    }

    if (assessment.syntheticDemo && assessment.status === 'Validated') {
      warnings.push(
        `Assessment "${assessment.id}" is marked both synthetic and validated.`
      );
    }
  }

  const offeringsWithoutAssessments = (portfolio.offerings || []).filter(
    offering =>
      !(portfolio.assessments || []).some(
        assessment => assessment.entityId === offering.id
      )
  );

  if (offeringsWithoutAssessments.length > 0) {
    warnings.push(
      `${offeringsWithoutAssessments.length} offerings do not have an assessment.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  HEALTH_VALUES,
  MATURITY_VALUES,
  DIRECTION_VALUES,
  VALIDATION_VALUES,
  SOURCE_VALUES,
  ASSESSMENT_STATUS_VALUES,
  RELATIONSHIP_ROLE_VALUES,
  CONFIDENCE_VALUES,
  LIFECYCLE_VALUES,
  COST_SIGNAL_VALUES,
  STRATEGIC_FIT_VALUES,
  RISK_VALUES,
  createAssessment,
  createRelationship,
  validatePortfolio
};