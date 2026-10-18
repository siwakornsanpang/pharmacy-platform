import type { StagedAsset, UploadIntent } from "@pharmacy/contracts/media";

export class MediaUploadError extends Error {
  constructor(public readonly status: number, message = "Upload failed") {
    super(message);
    this.name = "MediaUploadError";
  }
}

const intentPath = /^\/api\/media\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ticketPattern = /^[a-f0-9]{64}$/;

function assertIntent(intent: UploadIntent): URL {
  let url: URL;
  try { url = new URL(intent.uploadUrl); }
  catch { throw new MediaUploadError(400, "Invalid upload destination"); }
  if (url.protocol !== "https:" || url.username || url.password || !intentPath.test(url.pathname) || url.search || url.hash)
    throw new MediaUploadError(400, "Invalid upload destination");
  if (!ticketPattern.test(intent.ticket)) throw new MediaUploadError(400, "Invalid upload ticket");
  return url;
}

export async function uploadWithIntent(intent: UploadIntent, file: File, signal?: AbortSignal): Promise<StagedAsset> {
  const url = assertIntent(intent);
  if (signal?.aborted) throw new MediaUploadError(499, "Upload aborted");
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(), 300000);
  try {
    const response = await fetch(url, {
      method: "POST",
      body: file,
      headers: { "x-upload-ticket": intent.ticket, "content-type": "application/octet-stream" },
      credentials: "omit",
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new MediaUploadError(response.status);
    const body: unknown = text ? JSON.parse(text) : null;
    if (!body || typeof body !== "object" || Array.isArray(body) || !("id" in body) || !("owner" in body))
      throw new MediaUploadError(503, "Invalid upload response");
    return body as StagedAsset;
  } catch (error) {
    if (error instanceof MediaUploadError) throw error;
    if (signal?.aborted || controller.signal.aborted) throw new MediaUploadError(499, "Upload aborted");
    throw new MediaUploadError(503, "Upload failed");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
