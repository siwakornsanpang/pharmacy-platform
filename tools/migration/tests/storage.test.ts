import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { copyObjects, hashBytes } from "../storage";
import { createFakeStorage, migrationFixture } from "./fixtures";
import { registerFakeStorage } from "../inventory";
import type { ObjectManifest } from "../types";

function object(path: string, payload: Buffer, visibility: "public" | "private" = "private"): ObjectManifest {
  return {
    bucket: visibility === "public" ? "public" : "private",
    path,
    size: payload.length,
    sha256: hashBytes(payload),
    mime: "application/pdf",
    visibility,
    ownerRefs: [],
  };
}

test("copy fails closed on missing, tamper, interrupt, and never deletes source", async () => {
  const fixture = await migrationFixture();
  try {
    const pdf = Buffer.from("%PDF-fixture");
    const original = Buffer.from("original-bytes");
    const unreferenced = Buffer.from("orphan");
    const pdfObject = object("fixture/object.pdf", pdf);
    const originalObject = object("fixture/original.bin", original);
    const orphanObject = object("fixture/orphan.bin", unreferenced);
    fixture.storage.objects.push(pdfObject, originalObject, orphanObject);
    fixture.storage.bytes.set(pdfObject.path, pdf);
    fixture.storage.bytes.set(originalObject.path, original);
    fixture.storage.bytes.set(orphanObject.path, unreferenced);
    const manifest = {
      version: 1 as const,
      snapshotId: "s",
      tables: [],
      roles: [],
      sequences: [],
      objects: [pdfObject, originalObject, orphanObject],
      assetReferences: [],
      exceptions: [],
      licenses: [],
    };

    const failed = await copyObjects(fixture.config, manifest, { failAt: "fixture/object.pdf" });
    assert.equal(failed.passed, false);
    assert.deepEqual(failed.objectMismatches, ["fixture/object.pdf"]);
    assert.equal(fixture.storage.removed.length, 0);

    const tampered = await copyObjects(fixture.config, manifest, { tamper: "fixture/object.pdf" });
    assert.equal(tampered.passed, false);
    assert.deepEqual(tampered.objectMismatches, ["fixture/object.pdf"]);

    const missingManifest = { ...manifest, objects: [...manifest.objects, object("fixture/missing.pdf", Buffer.from("x"))] };
    const missing = await copyObjects(fixture.config, missingManifest);
    assert.equal(missing.passed, false);
    assert.ok(missing.objectMismatches.includes("fixture/missing.pdf"));

    const first = await copyObjects(fixture.config, manifest);
    assert.equal(first.passed, true);
    const second = await copyObjects(fixture.config, manifest);
    assert.equal(second.passed, true);
    assert.equal(second.copied, 0);
    assert.equal(second.skipped, 3);
    assert.equal(second.duplicateWrites, 0);
    assert.equal(fixture.storage.removed.length, 0);
    assert.ok(fixture.targetStorage.get("fixture/original.bin")?.equals(original));
    assert.ok(fixture.targetStorage.get("fixture/orphan.bin")?.equals(unreferenced));
  } finally {
    await fixture.cleanup();
  }
});

test("conflicting target bytes fail rather than overwrite", async () => {
  const fixture = await migrationFixture();
  try {
    const payload = Buffer.from("keep-me");
    const item = object("fixture/object.pdf", payload);
    fixture.storage.objects.push(item);
    fixture.storage.bytes.set(item.path, payload);
    const other = createFakeStorage([]);
    other.put({ ...item, sha256: createHash("sha256").update("nope").digest("hex") }, Buffer.from("nope"));
    registerFakeStorage(fixture.config.targetStorage, other);
    const report = await copyObjects(fixture.config, {
      version: 1, snapshotId: "s", tables: [], roles: [], sequences: [], objects: [item],
      assetReferences: [], exceptions: [], licenses: [],
    });
    assert.equal(report.passed, false);
    assert.deepEqual(report.objectMismatches, ["fixture/object.pdf"]);
    assert.equal(other.get("fixture/object.pdf")?.toString(), "nope");
  } finally {
    await fixture.cleanup();
  }
});
