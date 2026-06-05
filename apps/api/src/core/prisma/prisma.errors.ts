export enum PrismaErrors {
  // ================================
  // 🌐 P1xxx — Engine & Connection Errors
  // ================================

  /** Authentication failed */
  AuthFailed = 'P1000',

  /** Database server not reachable */
  ServerNotReachable = 'P1001',

  /** Timeout reaching the database */
  ServerTimeout = 'P1002',

  /** Database does not exist */
  DatabaseNotFound = 'P1003',

  /** Operation timed out */
  OperationTimeout = 'P1008',

  /** Database already exists */
  DatabaseAlreadyExists = 'P1009',

  /** User not authorized */
  UserNotAuthorized = 'P1010',

  /** TLS connection error */
  TLSError = 'P1011',

  /** Prisma schema parse error */
  SchemaParseError = 'P1012',

  /** Missing environment variable */
  MissingEnvVar = 'P1013',

  /** SQLite file not found */
  SQLiteFileNotFound = 'P1014',

  /** Unsupported SQLite file version */
  SQLiteInvalidVersion = 'P1015',

  /** Invalid database credentials */
  InvalidCredentials = 'P1016',

  /** Server closed the connection */
  ServerClosedConnection = 'P1017',

  /** Prisma schema error */
  SchemaError = 'P1018',

  /** Unsupported feature */
  UnsupportedFeature = 'P1020',

  /** Invalid database URL */
  InvalidURL = 'P1021',

  /** Connection dropped */
  ConnectionDropped = 'P1022',

  /** Invalid connection arguments */
  InvalidConnectionArguments = 'P1023',

  /** Query engine failure */
  QueryEngineFailure = 'P1024',

  /** Database reached its limit */
  DatabaseLimitReached = 'P1025',

  /** Internal engine error */
  EngineInternalError = 'P1026',

  /** Migration-related error */
  MigrationError = 'P1027',

  /** Invalid datasource configuration */
  InvalidDatasourceConfig = 'P1028',

  /** Too many connections */
  TooManyConnections = 'P1029',

  /** Database not reachable (generic) */
  DatabaseConnectionFailed = 'P1030',

  /** Missing table */
  MissingTable = 'P1031',

  /** Engine panic */
  EnginePanic = 'P1032',

  /** Database already exists (variant) */
  DatabaseExistsVariant = 'P1033',

  /** Unsupported database engine */
  UnsupportedDatabaseEngine = 'P1034',

  /** SSL/TLS handshake timeout */
  TLSHandshakeTimeout = 'P1035',

  /** Connection pool timeout */
  ConnectionPoolTimeout = 'P1036',

  /** Connection closed unexpectedly */
  UnexpectedConnectionClose = 'P1037',

  /** Migration format conflict */
  MigrationFormatConflict = 'P1038',

  /** JavaScript engine panic */
  JavaScriptEnginePanic = 'P1039',

  /** Max connections exceeded */
  MaxConnectionsExceeded = 'P1040',

  /** Database busy */
  DatabaseBusy = 'P1041',

  /** Invalid schema type */
  InvalidSchemaType = 'P1042',

  /** Invalid migration */
  InvalidMigration = 'P1043',

  /** Invalid database name */
  InvalidDatabaseName = 'P1044',

  // ================================
  // 🗄️ P2xxx — Query Engine & Constraint Errors
  // ================================

  /** Value too long for column */
  ValueTooLong = 'P2000',

  /** Record not found */
  RecordNotFound = 'P2001',

  /** Unique constraint violation */
  UniqueConstraintViolation = 'P2002',

  /** Foreign key constraint failed */
  ForeignKeyViolation = 'P2003',

  /** Database constraint failed */
  ConstraintFailed = 'P2004',

  /** Invalid value for field */
  InvalidFieldValue = 'P2005',

  /** Invalid field type */
  InvalidFieldType = 'P2006',

  /** Data validation error */
  ValidationError = 'P2007',

  /** Query parsing error */
  QueryParsingError = 'P2008',

  /** Query validation error */
  QueryValidationError = 'P2009',

  /** Raw query failed */
  RawQueryFailed = 'P2010',

  /** Null constraint violation */
  NullConstraintViolation = 'P2011',

  /** Missing required field */
  MissingRequiredField = 'P2012',

  /** Missing required argument */
  MissingRequiredArgument = 'P2013',

  /** Relation violation */
  RelationViolation = 'P2014',

  /** Related record not found */
  RelatedRecordNotFound = 'P2015',

  /** Query interpretation error */
  QueryInterpretationError = 'P2016',

  /** Records mismatch in relation */
  RelationRecordsMismatch = 'P2017',

  /** Connected records not found */
  RequiredConnectedRecordsNotFound = 'P2018',

  /** Input value invalid */
  InvalidInputValue = 'P2019',

  /** Value out of range */
  ValueOutOfRange = 'P2020',

  /** Table not found */
  TableNotFound = 'P2021',

  /** Column not found */
  ColumnNotFound = 'P2022',

  /** Inconsistent column data */
  InconsistentColumnData = 'P2023',

  /** Timeout fetching connection from pool */
  PoolTimeout = 'P2024',

  /** Record for update/delete not found */
  RecordNotFoundForOperation = 'P2025',

  /** Unsupported feature for this database */
  UnsupportedFeatureQuery = 'P2026',

  /** Multiple database errors */
  MultipleDatabaseErrors = 'P2027',

  /** Transaction API error */
  TransactionAPIError = 'P2028',

  /** Query execution problem */
  QueryExecutionError = 'P2029',

  /** Database constraint violation */
  DatabaseConstraintViolation = 'P2030',

  /** JSON parsing error */
  JSONParsingError = 'P2033',

  /** Transaction conflict */
  TransactionConflict = 'P2034',

  /** Unsupported ordering */
  UnsupportedOrdering = 'P2035',

  /** Range error */
  RangeError = 'P2036',

  /** Invalid JSON payload */
  InvalidJSONPayload = 'P2037',

  /** Batch transaction error */
  BatchTransactionError = 'P2038',

  /** Missing environment variable */
  MissingEnvironmentVariable = 'P2039',

  /** Unique constraint race condition */
  UniqueConstraintRaceCondition = 'P2040',

  /** Required relation missing */
  RequiredRelationMissing = 'P2041',
}
