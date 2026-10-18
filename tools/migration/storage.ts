import { createHash } from "node:crypto";
import { getFakeStorage } from "./inventory";
import type { CopyReport, MigrationConfig, MigrationManifest, ObjectManifest } from "./types";

export function hashBytes(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

export async function copyObjects(
  config: MigrationConfig,
  manifest: MigrationManifest,
  options: { failAt?: string; tamper?: string } = {},
): Promise<CopyReport> {
  const source = getFakeStorage(config.sourceStorage);
  const target = getFakeStorage(config.targetStorage);
  if (!source || !target) throw new Error("storage adapter is required");
  const used = [...target.bytes.values()].reduce((sum, value) => sum + value.length, 0);
  const report: CopyReport = {
    copied: 0,
    skipped: 0,
    duplicateWrites: 0,
    objectMismatches: [],
    sourceRemoved: [],
    passed: true,
  };
  for (const object of manifest.objects) {
    if (object.size > source.maxObjectBytes || object.size > target.maxObjectBytes) {
      report.objectMismatches.push(object.path);
      report.passed = false;
      continue;
    }
    if (used + object.size > target.capacityBytes) {
      report.objectMismatches.push(object.path);
      report.passed = false;
      continue;
    }
    const data = source.get(object.path);
    if (!data) {
      report.objectMismatches.push(object.path);
      report.passed = false;
      continue;
    }
    if (options.failAt === object.path) {
      report.objectMismatches.push(object.path);
      report.passed = false;
      continue;
    }
    let payload = Buffer.from(data);
    if (options.tamper === object.path) payload[0] = payload[0] ^ 0xff;
    const digest = hashBytes(payload);
    if (digest !== object.sha256 && options.tamper !== object.path) {
      report.objectMismatches.push(object.path);
      report.passed = false;
      continue;
    }
    if (options.tamper === object.path) {
      report.objectMismatches.push(object.path);
      report.passed = false;
      continue;
    }
    const existing = target.get(object.path);
    if (existing && existing.equals(payload)) {
      report.skipped += 1;
      continue;
    }
    try {
      const stored: ObjectManifest = { ...object, visibility: object.visibility };
      target.put(stored, payload);
      report.copied += 1;
    } catch {
      report.objectMismatches.push(object.path);
      report.passed = false;
    }
  }
  report.duplicateWrites = target.duplicateWrites;
  report.sourceRemoved = [...source.removed];
  if (source.removed.length) report.passed = false;
  return report;
}
