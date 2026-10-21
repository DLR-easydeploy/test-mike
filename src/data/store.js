const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const databasePath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'portfolio.db');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  assessment_date TEXT NOT NULL,
  health TEXT NOT NULL CHECK (health IN ('green','yellow','red')),
  maturity TEXT NOT NULL,
  direction TEXT NOT NULL,
  lifecycle TEXT NOT NULL,
  risk TEXT NOT NULL,
  cost_signal TEXT NOT NULL,
  strategic_fit TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '',
  risks TEXT NOT NULL DEFAULT '',
  measurable_outcomes TEXT NOT NULL DEFAULT '',
  recommended_actions TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  assessor TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  synthetic_demo INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'Proposed',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assessments_entity_date ON assessments(entity_id, assessment_date DESC, created_at DESC);
CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  offering_id TEXT NOT NULL DEFAULT '',
  product_id TEXT NOT NULL DEFAULT '',
  owner TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Not Started',
  priority TEXT NOT NULL DEFAULT 'Medium',
  expected_outcome TEXT NOT NULL DEFAULT '',
  source_assessment_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_actions_status_due ON actions(status, due_date);
CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT '',
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
`);

const selectAll = db.prepare('SELECT * FROM assessments ORDER BY assessment_date DESC, created_at DESC');
const selectCount = db.prepare('SELECT COUNT(*) AS count FROM assessments');
const insertAssessment = db.prepare(`INSERT INTO assessments (
  id, entity_type, entity_id, assessment_date, health, maturity, direction, lifecycle,
  risk, cost_signal, strategic_fit, summary, evidence, risks, measurable_outcomes,
  recommended_actions, owner, assessor, status, synthetic_demo, source, created_at, updated_at
) VALUES (
  @id, @entity_type, @entity_id, @assessment_date, @health, @maturity, @direction, @lifecycle,
  @risk, @cost_signal, @strategic_fit, @summary, @evidence, @risks, @measurable_outcomes,
  @recommended_actions, @owner, @assessor, @status, @synthetic_demo, @source, @created_at, @updated_at
)`);
const insertAudit = db.prepare(`INSERT INTO audit_events (entity_type, entity_id, action, actor, details_json, created_at)
VALUES (@entity_type, @entity_id, @action, @actor, @details_json, @created_at)`);

function toRow(value) {
  const now = new Date().toISOString();
  return {
    id:value.id, entity_type:value.entityType||'offering', entity_id:value.entityId,
    assessment_date:value.assessmentDate||now.slice(0,10), health:value.health,
    maturity:value.maturity, direction:value.direction, lifecycle:value.lifecycle||'Active',
    risk:value.risk||'Unknown', cost_signal:value.costSignal||'Unknown',
    strategic_fit:value.strategicFit||'Unknown', summary:value.summary||'', evidence:value.evidence||'',
    risks:value.risks||'', measurable_outcomes:value.measurableOutcomes||'',
    recommended_actions:value.recommendedActions||'', owner:value.owner||'', assessor:value.assessor||'',
    status:value.status||'Submitted', synthetic_demo:value.syntheticDemo?1:0,
    source:value.source||'Proposed', created_at:value.createdAt||now, updated_at:value.updatedAt||now
  };
}
function fromRow(row) {
  return {
    id:row.id, entityType:row.entity_type, entityId:row.entity_id,
    assessmentDate:row.assessment_date, health:row.health, maturity:row.maturity,
    direction:row.direction, lifecycle:row.lifecycle, risk:row.risk,
    costSignal:row.cost_signal, strategicFit:row.strategic_fit, summary:row.summary,
    evidence:row.evidence, risks:row.risks, measurableOutcomes:row.measurable_outcomes,
    recommendedActions:row.recommended_actions, owner:row.owner, assessor:row.assessor,
    status:row.status, syntheticDemo:Boolean(row.synthetic_demo), source:row.source,
    createdAt:row.created_at, updatedAt:row.updated_at
  };
}
function seedAssessments(assessments) {
  if (selectCount.get().count > 0) return;
  const seed = db.transaction(items => { for (const item of items) insertAssessment.run(toRow(item)); });
  seed(assessments);
}
function listAssessments() { return selectAll.all().map(fromRow); }
function createAssessment(value) {
  const row = toRow(value);
  const transaction = db.transaction(() => {
    insertAssessment.run(row);
    insertAudit.run({entity_type:'assessment',entity_id:row.id,action:'created',actor:row.assessor,details_json:JSON.stringify({offeringId:row.entity_id,health:row.health,maturity:row.maturity,direction:row.direction}),created_at:row.created_at});
  });
  transaction();
  return fromRow(row);
}

const selectActions = db.prepare("SELECT * FROM actions ORDER BY CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END, due_date, created_at DESC");
const insertAction = db.prepare(`INSERT INTO actions (id,title,description,offering_id,product_id,owner,due_date,status,priority,expected_outcome,source_assessment_id,created_at,updated_at)
VALUES (@id,@title,@description,@offering_id,@product_id,@owner,@due_date,@status,@priority,@expected_outcome,@source_assessment_id,@created_at,@updated_at)`);
const updateActionStmt = db.prepare(`UPDATE actions SET title=@title,description=@description,offering_id=@offering_id,product_id=@product_id,owner=@owner,due_date=@due_date,status=@status,priority=@priority,expected_outcome=@expected_outcome,source_assessment_id=@source_assessment_id,updated_at=@updated_at WHERE id=@id`);
function actionRow(value){const now=new Date().toISOString();return {id:value.id||'action-'+Date.now(),title:value.title||'',description:value.description||'',offering_id:value.offeringId||'',product_id:value.productId||'',owner:value.owner||'',due_date:value.dueDate||'',status:value.status||'Not Started',priority:value.priority||'Medium',expected_outcome:value.expectedOutcome||'',source_assessment_id:value.sourceAssessmentId||'',created_at:value.createdAt||now,updated_at:now};}
function actionValue(row){return {id:row.id,title:row.title,description:row.description,offeringId:row.offering_id,productId:row.product_id,owner:row.owner,dueDate:row.due_date,status:row.status,priority:row.priority,expectedOutcome:row.expected_outcome,sourceAssessmentId:row.source_assessment_id,createdAt:row.created_at,updatedAt:row.updated_at};}
function listActions(){return selectActions.all().map(actionValue);}
function createAction(value){const row=actionRow(value);insertAction.run(row);insertAudit.run({entity_type:'action',entity_id:row.id,action:'created',actor:row.owner,details_json:JSON.stringify({title:row.title,status:row.status}),created_at:row.created_at});return actionValue(row);}
function updateAction(id,value){const existing=selectActions.all().find(x=>x.id===id);if(!existing)return null;const row=actionRow({...actionValue(existing),...value,id,createdAt:existing.created_at});updateActionStmt.run(row);insertAudit.run({entity_type:'action',entity_id:id,action:'updated',actor:row.owner,details_json:JSON.stringify({status:row.status}),created_at:row.updated_at});return actionValue(row);}

function storageInfo() {
  return {adapter:'sqlite',databasePath,persistentVolumeExpected:databasePath.startsWith('/data/'),assessmentCount:selectCount.get().count,actionCount:selectActions.all().length};
}
function close() { db.close(); }
module.exports = { seedAssessments, listAssessments, createAssessment, listActions, createAction, updateAction, storageInfo, close };
