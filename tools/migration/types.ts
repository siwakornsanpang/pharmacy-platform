export interface MigrationConfig {
  sourceDb: string;
  targetDb: string;
  sourceStorage: string;
  targetStorage: string;
  artifactDir: string;
  expectedTargetProjectRef: string;
}

export interface ObjectManifest {
  bucket: string;
  path: string;
  size: number;
  sha256: string;
  mime: string;
  visibility: "public" | "private";
  ownerRefs: string[];
}

export interface ReferenceRewrite {
  table: string;
  rowId: string;
  column: string;
  jsonPath: string;
  oldValue: string;
  newValue: string;
  assetId: string;
}

export interface MigrationManifest {
  version: 1;
  snapshotId: string;
  tables: Array<{ schema: string; name: string; columns: string[]; rowCount: number }>;
  roles: string[];
  sequences: Array<{ name: string; lastValue: string; isCalled: boolean }>;
  objects: ObjectManifest[];
  assetReferences: string[];
  exceptions: string[];
  licenses: string[];
}

export interface FakeStorage {
  objects: ObjectManifest[];
  bytes: Map<string, Buffer>;
  writes: unknown[];
  duplicateWrites: number;
  removed: string[];
  maxObjectBytes: number;
  capacityBytes: number;
  list(): ObjectManifest[];
  put(object: ObjectManifest, data: Buffer): void;
  get(path: string): Buffer | undefined;
}

export interface CopyReport {
  copied: number;
  skipped: number;
  duplicateWrites: number;
  objectMismatches: string[];
  sourceRemoved: string[];
  passed: boolean;
}

export interface ReconciliationReport {
  passed: boolean;
  tableCount: number;
  objectCount: number;
  idSetHash: string;
  dataHash: string;
  objectMismatches: string[];
  sequenceErrors: string[];
  exceptions: string[];
  usersRows: number;
}
