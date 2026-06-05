/**
 * OData resource registry.
 *
 * Declares which Prisma models are exposed via the OData v4 API and the safe
 * (whitelisted) list of fields and relations that clients are allowed to query
 * against. Anything not declared here is rejected, which gives us a single,
 * auditable choke point for the public read/write surface (ESA E11-01/05/07).
 */

export type ODataResource = {
  /**
   * URL slug used in `/api/odata/<name>`. Must be unique. Kebab-case for
   * multi-word resources (e.g. `production-chain`).
   */
  name: string;
  /**
   * Prisma client model name (the property accessor on `PrismaService`,
   * e.g. `productionChain`).
   */
  prismaModel: string;
  /**
   * Scalar fields that may appear in `$select`, `$filter`, `$orderby`.
   * Also used as the allow-list for OData write operations (POST/PATCH).
   */
  selectableFields: string[];
  /**
   * Relations that may appear in `$expand`.
   */
  expandableRelations: string[];
  /**
   * Whether this resource accepts POST / PATCH / DELETE via OData.
   *
   * `true`  — operator-mutable (admin/operator role required at the
   *            controller level via SessionGuard + RolesGuard).
   * `false` — read-only via OData; writes must go through the dedicated
   *            endpoints that encode the full FK + RBAC rules.
   */
  writable: boolean;
};

export const ODATA_RESOURCES: Record<string, ODataResource> = {
  task: {
    name: 'task',
    prismaModel: 'task',
    selectableFields: [
      'id',
      'projectId',
      'kind',
      'status',
      'executionTag',
      'scheduledStartTime',
      'priority',
    ],
    expandableRelations: [
      'project',
      'productionChain',
      'processorVersion',
      'batches',
    ],
    // Operator-mutable: tasks can be created/patched/deleted via OData.
    writable: true,
  },
  batch: {
    name: 'batch',
    prismaModel: 'batch',
    selectableFields: [
      'id',
      'projectId',
      'taskId',
      'status',
      'executionTag',
      'priority',
      'scheduledAt',
      'startedAt',
      'endedAt',
      'kind',
    ],
    expandableRelations: [
      'task',
      'project',
      'jobs',
      'parameters',
      'productionChainVersion',
      'processorVersion',
      'pool',
    ],
    // Operator-mutable.
    writable: true,
  },
  job: {
    name: 'job',
    prismaModel: 'job',
    selectableFields: [
      'id',
      'projectId',
      'batchId',
      'status',
      'executionTag',
      'startedAt',
      'endedAt',
      'hostId',
      'processingScriptVersionId',
    ],
    expandableRelations: ['batch', 'host', 'processingScriptVersion'],
    // Read-only via OData: lifecycle is managed exclusively via
    // cancel/pause/resume/result dedicated endpoints.
    writable: false,
  },
  host: {
    name: 'host',
    prismaModel: 'host',
    selectableFields: [
      'id',
      'hostname',
      'ipAddress',
      'status',
      'hasGpu',
      'gpuCount',
      'gpuModel',
      'dataCenterId',
      'containerRuntime',
    ],
    expandableRelations: ['dataCenter', 'pools'],
    // Read-only via OData: registration/heartbeat managed via dedicated paths.
    writable: false,
  },
  project: {
    name: 'project',
    prismaModel: 'project',
    selectableFields: ['id', 'identifier', 'name', 'isActive', 'createdAt'],
    expandableRelations: [],
    // Operator-mutable.
    writable: true,
  },
  product: {
    name: 'product',
    prismaModel: 'product',
    selectableFields: [
      'id',
      'name',
      'version',
      'productTypeId',
      'isDefault',
      'generatedAt',
      'size',
      'comment',
      'parameters',
      'parentBatchId',
      'createdAt',
    ],
    expandableRelations: ['productType'],
    // Operator-mutable.
    writable: true,
  },
  'product-type': {
    name: 'product-type',
    prismaModel: 'productType',
    selectableFields: ['id', 'acronym', 'name'],
    expandableRelations: [],
    // Read-only via OData: managed via dedicated CRUD endpoints.
    writable: false,
  },
  'production-chain': {
    name: 'production-chain',
    prismaModel: 'productionChain',
    selectableFields: ['id', 'name', 'comment', 'isActive', 'createdAt'],
    expandableRelations: ['versions', 'productTypes'],
    // Read-only via OData: managed via dedicated CRUD endpoints that enforce
    // FK integrity and RBAC for chain versioning.
    writable: false,
  },
  'production-chain-version': {
    name: 'production-chain-version',
    prismaModel: 'productionChainVersion',
    selectableFields: [
      'id',
      'version',
      'isLatest',
      'productionChainId',
      'createdAt',
    ],
    expandableRelations: ['processingChains', 'edges', 'batches'],
    // Read-only via OData: version lifecycle is managed by the dedicated
    // productionChain endpoints.
    writable: false,
  },
  'processing-script': {
    name: 'processing-script',
    prismaModel: 'processingScript',
    selectableFields: [
      'id',
      'name',
      'acronym',
      'defaultVersionId',
      'createdAt',
    ],
    expandableRelations: ['versions', 'defaultVersion'],
    // Read-only via OData: managed via dedicated CRUD endpoints.
    writable: false,
  },
  'processing-script-version': {
    name: 'processing-script-version',
    prismaModel: 'processingScriptVersion',
    selectableFields: [
      'id',
      'processingScriptId',
      'version',
      'isLatest',
      'runtime',
      'imageUrl',
      'imageTag',
      'requiredCpu',
      'requiredRam',
      'requiredDisk',
      'requiresGpu',
      'gpuCount',
      'createdAt',
    ],
    expandableRelations: ['processingScript', 'executables'],
    // Operator-mutable (processingScriptVersion maps to processorVersion in
    // the writable list).
    writable: true,
  },
  'processor-version': {
    name: 'processor-version',
    prismaModel: 'processorVersion',
    selectableFields: [
      'id',
      'baseline',
      'processingScriptVersionId',
      'auxiliaryConfigurationId',
      'createdAt',
    ],
    expandableRelations: ['processingScriptVersion', 'auxiliaryConfiguration'],
    // Operator-mutable.
    writable: true,
  },
};
