export interface Requirement {
  id: string;
  evolution: string;
  description: string;
  /**
   * Marks an architectural / infrastructure concern that is not addressable
   * via the e2e test harness. Reported as "N/A" in TRACEABILITY.md instead of
   * "Not covered".
   */
  na?: boolean;
}

const req = (id: string, description: string, opts: { na?: boolean } = {}): Requirement => {
  const evolution = id.split('-')[1];
  return { id, evolution, description, ...opts };
};

const NA = { na: true };

export const REQUIREMENTS: Requirement[] = [
  req('EOCP-E1-01', 'Modularity — components decoupled', NA),
  req('EOCP-E1-02', 'Standardized REST APIs'),
  req('EOCP-E1-03', 'Portability, observability, resilience', NA),
  req('EOCP-E1-04', 'Security in system design'),
  req('EOCP-E1-05', 'DB normalization, naming conventions', NA),

  req('EOCP-E2-01', 'Multiple production modes'),
  req('EOCP-E2-02', 'Mode-specific rules'),

  req('EOCP-E3-01', 'Evaluate resource requirements before dispatching'),
  req('EOCP-E3-02', 'Automatic node selection'),
  req('EOCP-E3-03', 'Declare task requirements statically or dynamically'),
  req('EOCP-E3-04', 'GPU resource management'),
  req('EOCP-E3-05', 'Nodes self-register'),
  req('EOCP-E3-06', 'Nodes declare status'),
  req('EOCP-E3-07', 'Nodes update characteristics in real-time'),

  req('EOCP-E4-01', 'Processing chains — linear process flows'),
  req('EOCP-E4-02', 'Request/batch structure kept'),
  req('EOCP-E4-03', 'Production chains embed multiple processing chains'),
  req('EOCP-E4-04', 'Processing chains reusable'),
  req('EOCP-E4-05', 'Conditional execution based on params'),
  req('EOCP-E4-06', 'Conditional execution (A before B)'),
  req('EOCP-E4-07', 'Parallel chain detection'),

  req('EOCP-E5-01', 'Explicit task dependencies'),
  req('EOCP-E5-02', 'DAG-based dependencies'),
  req('EOCP-E5-03', 'Declarative dependency model'),
  req('EOCP-E5-04', 'Dependency types: success, failure, completion'),
  req('EOCP-E5-05', 'Runtime dependency resolution'),

  req('EOCP-E6-01', 'Scheduling engine'),
  req('EOCP-E6-02', 'Multi-site production'),
  req('EOCP-E6-03', 'Job dispatcher'),
  req('EOCP-E6-04', 'Queue manager'),
  req('EOCP-E6-05', 'Node registry & health monitoring'),
  req('EOCP-E6-06', 'Execution engine interface'),
  req('EOCP-E6-07', 'Persistence layer'),
  req('EOCP-E6-08', 'Federated scheduling'),
  req('EOCP-E6-09', 'Priority engine'),
  req('EOCP-E6-10', 'Elastic compute pools'),
  req('EOCP-E6-11', 'Fault tolerance & rescheduling'),

  req('EOCP-E7-01', 'Multiple triggering mechanisms'),
  req('EOCP-E7-02', 'Manual triggering'),
  req('EOCP-E7-03', 'Triggering via API'),
  req('EOCP-E7-04', 'Data-driven triggering'),
  req('EOCP-E7-05', 'Event-based triggering'),
  req('EOCP-E7-06', 'Scheduled triggering'),

  req('EOCP-E8-01', 'Multiple processor versions coexist'),
  req('EOCP-E8-02', 'Version selectable and traceable'),
  req('EOCP-E8-03', 'Versioning covers executables and aux files'),

  req('EOCP-E9-01', 'Task Tables to DB conversion'),
  req('EOCP-E9-02', 'Automated TT ingestion'),
  req('EOCP-E9-03', 'TT conversions traceable'),

  req('EOCP-E10-01', 'Priority levels for tasks/chains'),
  req('EOCP-E10-02', 'Priority weights'),
  req('EOCP-E10-03', 'Dynamic execution order by priority'),
  req('EOCP-E10-04', 'Launch jobs when no resources'),

  req('EOCP-E11-01', 'REST APIs for launching/querying'),
  req('EOCP-E11-02', 'APIs for job lifecycle'),
  req('EOCP-E11-03', 'APIs for task status reporting'),
  req('EOCP-E11-04', 'APIs for resource reservation'),
  req('EOCP-E11-05', 'APIs for metadata/catalogue'),
  req('EOCP-E11-06', 'APIs for system modifications'),
  req('EOCP-E11-07', 'API pagination, filtering, auth'),

  req('EOCP-E12-01', 'User authentication'),
  req('EOCP-E12-02', 'Role-based access control'),
  req('EOCP-E12-03', 'Secure communication (HTTPS)', NA),
  req('EOCP-E12-04', 'Security event logging'),
  req('EOCP-E12-05', 'External IAM integration'),

  req('EOCP-E13-01', 'Docker/Apptainer execution'),
  req('EOCP-E13-02', 'Standard container interface'),
  req('EOCP-E13-03', 'Container security/resource limits'),

  req('EOCP-E14-01', 'Multiple product versions coexist'),
  req('EOCP-E14-02', 'Product versions traceable'),
  req('EOCP-E14-03', 'Version selection at config level'),

  req('EOCP-E15-01', 'Resource consumption metrics'),
  req('EOCP-E15-02', 'Metrics per task/chain/batch'),
  req('EOCP-E15-03', 'Export for trend analysis'),
];
