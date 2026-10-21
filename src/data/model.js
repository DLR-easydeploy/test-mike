const HEALTH_VALUES=['green','yellow','red'];
const MATURITY_VALUES=['Emerging','Developing','Established','Leading'];
const DIRECTION_VALUES=['Invest','Improve','Maintain','Consolidate','Retire'];
const VALIDATION_VALUES=['Validated','Needs Review','Synthetic Demo','Missing Assessment'];
const SOURCE_VALUES=['Monday','Other Agent','Both','Proposed'];
const ASSESSMENT_STATUS_VALUES=['Draft','Submitted','Validated','Superseded'];
const RELATIONSHIP_ROLE_VALUES=['Primary platform','Primary application','Primary platform/module','Primary data platform','Primary enablement platform','Enablement platform','Supporting platform','Source system','Source/target system','Authoritative system','Authoritative data source','Reporting platform','Content platform','Knowledge platform','Work management platform','Portfolio platform','System under test','Managed platform','Managed platform/application','Potential monitoring/reconciliation platform'];
const CONFIDENCE_VALUES=['High','Medium','Low'];
const LIFECYCLE_VALUES=['Proposed','Active','Changing','Retiring','Retired'];
const COST_SIGNAL_VALUES=['Low','Moderate','High','Unknown'];
const STRATEGIC_FIT_VALUES=['Low','Moderate','High','Unknown'];
const RISK_VALUES=['Low','Moderate','High','Critical','Unknown'];
function createAssessment(values){return {...values};}
function createRelationship(values){return {...values};}
function validatePortfolio(portfolio){
  const errors=[]; const warnings=[]; const ids=new Map();
  function add(type,item){if(!item.id)errors.push(type+' record missing id');else if(ids.has(item.id))errors.push('Duplicate id '+item.id);else ids.set(item.id,type);}
  for(const x of portfolio.domains||[])add('domain',x);
  for(const x of portfolio.services||[]){add('service',x);if(!ids.has(x.domainId))errors.push('Service '+x.name+' references missing domain '+x.domainId);}
  for(const x of portfolio.offerings||[]){add('offering',x);if(!(portfolio.services||[]).some(s=>s.id===x.serviceId))errors.push('Offering '+x.name+' references missing service '+x.serviceId);}
  for(const x of portfolio.products||[])add('product',x);
  for(const x of portfolio.relationships||[]){add('relationship',x);if(!(portfolio.offerings||[]).some(o=>o.id===x.offeringId))errors.push('Relationship '+x.id+' missing offering');if(!(portfolio.products||[]).some(p=>p.id===x.productId))errors.push('Relationship '+x.id+' missing product');}
  for(const x of portfolio.assessments||[]){add('assessment',x);if(!ids.has(x.entityId))errors.push('Assessment '+x.id+' references missing entity '+x.entityId);}
  const missing=(portfolio.offerings||[]).filter(o=>!(portfolio.assessments||[]).some(a=>a.entityId===o.id)).length;
  if(missing)warnings.push(missing+' offerings do not have an assessment.');
  return {valid:errors.length===0,errors,warnings};
}
module.exports={HEALTH_VALUES,MATURITY_VALUES,DIRECTION_VALUES,VALIDATION_VALUES,SOURCE_VALUES,ASSESSMENT_STATUS_VALUES,RELATIONSHIP_ROLE_VALUES,CONFIDENCE_VALUES,LIFECYCLE_VALUES,COST_SIGNAL_VALUES,STRATEGIC_FIT_VALUES,RISK_VALUES,createAssessment,createRelationship,validatePortfolio};
