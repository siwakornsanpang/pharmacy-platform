import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCutover } from "../cutover";
import type { ReconciliationReport } from "../types";

const passed: ReconciliationReport = {
  passed: true,
  tableCount: 1,
  objectCount: 1,
  idSetHash: "a",
  dataHash: "b",
  objectMismatches: [],
  sequenceErrors: [],
  exceptions: [],
  usersRows: 0,
};

test("cutover never selects the stale source", () => {
  assert.equal(evaluateCutover({
    reconciliation: { ...passed, passed: false, objectMismatches: ["fixture/object.pdf"] },
    writersFrozen: true,
    newWrites: false,
    compatibleReleaseAvailable: true,
  }), "blocked");
  assert.equal(evaluateCutover({
    reconciliation: passed,
    writersFrozen: false,
    newWrites: false,
    compatibleReleaseAvailable: true,
  }), "blocked");
  assert.equal(evaluateCutover({
    reconciliation: passed,
    writersFrozen: true,
    newWrites: false,
    compatibleReleaseAvailable: false,
  }), "ready");
  assert.equal(evaluateCutover({
    reconciliation: passed,
    writersFrozen: true,
    newWrites: true,
    compatibleReleaseAvailable: true,
  }), "keep-new-db-and-revert-app");
  assert.equal(evaluateCutover({
    reconciliation: passed,
    writersFrozen: true,
    newWrites: true,
    compatibleReleaseAvailable: false,
  }), "requires-reconcile");
});
