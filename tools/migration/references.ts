import type { MigrationManifest, ReferenceRewrite } from "./types";

const internalHost = /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/(?:public|sign)\/([^?\s"']+)/gi;
const externalKeep = /https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|conference\.)[^\s"']+/gi;

export function buildReferencePlan(manifest: MigrationManifest): ReferenceRewrite[] {
  const rewrites: ReferenceRewrite[] = [];
  const seen = new Set<string>();
  for (const ref of manifest.assetReferences) {
    internalHost.lastIndex = 0;
    const match = internalHost.exec(ref);
    if (!match) continue;
    const key = match[1] ?? ref;
    if (seen.has(key)) continue;
    seen.add(key);
    rewrites.push({
      table: "news",
      rowId: "*",
      column: "title",
      jsonPath: "",
      oldValue: ref,
      newValue: `https://storage.example.test/${key}`,
      assetId: key,
    });
  }
  return rewrites;
}

export function preserveExternalUrl(value: string) {
  externalKeep.lastIndex = 0;
  return value;
}
