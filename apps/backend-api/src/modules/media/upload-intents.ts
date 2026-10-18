import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import type { AssetKind, AssetOwner, StagedAsset, UploadIntent, UploadIntentMetadata } from '@pharmacy/contracts/media';
import type { PermissionKey } from '@pharmacy/contracts/access';
import type { Database, QueryClient } from '../../db/client';
import type { BackendConfig } from '../../config/server';
import type { createAccessService } from '../access/service';
import { allowedMimeFor, parseFilename, parseKind, parseOwner } from './policy';
import type { MediaService } from './service';
import type { ClaimedUploadIntent, MediaOwnerAuthorizer, VerifiedUploadActor } from './types';
import { MediaError } from './types';
import { maxSniffBytes } from './validate';

export const ticketTtlSeconds = 300;
export const jsonMetadataMaxBytes = 4_000_000;
const ticketPattern = /^[a-f0-9]{64}$/;

export function parseTicket(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string' || !ticketPattern.test(raw)) throw new MediaError(400, 'Invalid upload ticket');
  return raw;
}

export function ticketHash(ticket: string): string {
  return createHash('sha256').update(ticket, 'utf8').digest('hex');
}

export function parseIntentId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
    throw new MediaError(400, 'Invalid upload intent');
  return value;
}

function actorColumns(actor: VerifiedUploadActor) {
  if (actor.kind === 'staff') {
    return {
      actorKind: actor.kind, actorKey: actor.actorKey, userId: String(actor.userId), sessionId: actor.sessionId,
      requiredCapability: actor.requiredCapability, pharmacistLicense: null, displayName: null, subject: null,
    };
  }
  return {
    actorKind: actor.kind, actorKey: actor.actorKey, userId: null, sessionId: null, requiredCapability: null,
    pharmacistLicense: actor.pharmacistLicense, displayName: actor.displayName, subject: actor.subject,
  };
}

function actorFromRow(row: Record<string, unknown>): VerifiedUploadActor {
  if (row.actor_kind === 'staff') {
    return {
      kind: 'staff', actorKey: row.actor_key as string, userId: Number(row.user_id),
      sessionId: row.session_id as string, requiredCapability: row.required_capability as PermissionKey,
    };
  }
  return {
    kind: 'pharmacy-mock', actorKey: row.actor_key as string, subject: row.subject as string,
    pharmacistLicense: row.pharmacist_license as string, displayName: row.display_name as string,
  };
}

export async function spoolUpload(
  stream: AsyncIterable<Uint8Array>,
  options: { declaredSize: number; maxBytes: number; sniffBytes: number; signal?: AbortSignal },
): Promise<{ path: string; sniff: Buffer; size: number; cleanup: () => Promise<void> }> {
  const sniffLimit = Math.min(options.sniffBytes, maxSniffBytes);
  const dir = join(tmpdir(), `pharmacy-media-${randomUUID()}`);
  await mkdir(dir, { mode: 0o700 });
  const path = join(dir, 'blob');
  const cleanup = async () => { await rm(dir, { recursive: true, force: true }); };
  let size = 0;
  const sniffChunks: Buffer[] = [];
  let sniffSize = 0;
  try {
    await pipeline(
      stream as NodeJS.ReadableStream,
      new Transform({
        transform(chunk, _encoding, callback) {
          if (options.signal?.aborted) {
            callback(new MediaError(400, 'Upload aborted'));
            return;
          }
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += buffer.length;
          if (size > options.declaredSize || size > options.maxBytes) {
            callback(new MediaError(413, 'Upload too large'));
            return;
          }
          if (sniffSize < sniffLimit) {
            const take = buffer.subarray(0, sniffLimit - sniffSize);
            sniffChunks.push(take);
            sniffSize += take.length;
          }
          callback(null, buffer);
        },
      }),
      createWriteStream(path, { flags: 'wx' }),
    );
    if (size !== options.declaredSize) throw new MediaError(400, 'Upload length mismatch');
    return { path, sniff: Buffer.concat(sniffChunks), size, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export function createUploadIntentService({
  db, config, clock, media, authorizers, access,
}: {
  db: Database;
  config: BackendConfig;
  clock: () => Date;
  media: MediaService;
  authorizers: Record<AssetOwner['domain'], MediaOwnerAuthorizer>;
  access: Pick<ReturnType<typeof createAccessService>, 'resolveStoredStaffSession'>;
}) {
  async function createUploadIntent(input: {
    verifiedActor: VerifiedUploadActor;
    owner: AssetOwner;
    kind: AssetKind;
    metadata: UploadIntentMetadata;
  }): Promise<UploadIntent> {
    const owner = parseOwner(input.owner);
    const kind = parseKind(input.kind);
    const filename = parseFilename(input.metadata.filename);
    const mime = allowedMimeFor(kind, input.metadata.declaredMime, filename);
    if (!Number.isSafeInteger(input.metadata.size) || input.metadata.size < 1 || input.metadata.size > config.uploadMaxBytes)
      throw new MediaError(413, 'Upload too large');
    const authorizer = authorizers[owner.domain];
    if (!authorizer || !await authorizer.authorizeUpload(owner, kind, input.verifiedActor))
      throw new MediaError(403, 'Media owner denied');
    const id = randomUUID();
    const ticket = randomBytes(32).toString('hex');
    const expiresAt = new Date(clock().getTime() + ticketTtlSeconds * 1000);
    const actor = actorColumns(input.verifiedActor);
    await db.query(`INSERT INTO media_upload_intents(
      id,ticket_hash,owner_domain,owner_type,owner_id,owner_slot,kind,filename,mime,byte_size,
      actor_kind,actor_key,user_id,session_id,required_capability,pharmacist_license,display_name,subject,expires_at,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [id, ticketHash(ticket), owner.domain, owner.type, owner.id, owner.slot, kind, filename, mime, input.metadata.size,
      actor.actorKind, actor.actorKey, actor.userId, actor.sessionId, actor.requiredCapability,
      actor.pharmacistLicense, actor.displayName, actor.subject, expiresAt, clock()]);
    return {
      id, ticket, expiresAt: expiresAt.toISOString(),
      uploadUrl: `${config.publicUploadBaseUrl}/api/media/uploads/${id}`,
    };
  }

  async function claimIntent(intentId: string, ticket: string, now: Date): Promise<ClaimedUploadIntent> {
    const claimed = await db.withTransaction(async (tx: QueryClient) => {
      const row = (await tx.query(`UPDATE media_upload_intents SET consumed_at=$1
        WHERE id=$2 AND ticket_hash=$3 AND consumed_at IS NULL AND expires_at>$1
        RETURNING *`, [now, intentId, ticketHash(ticket)])).rows[0];
      if (!row) {
        const existing = (await tx.query('SELECT id,consumed_at,expires_at FROM media_upload_intents WHERE id=$1 AND ticket_hash=$2',
          [intentId, ticketHash(ticket)])).rows[0];
        if (!existing) throw new MediaError(401, 'Invalid upload ticket');
        if (existing.consumed_at) throw new MediaError(409, 'Upload ticket already used');
        throw new MediaError(401, 'Upload ticket expired');
      }
      return row;
    });
    const actor = actorFromRow(claimed);
    const owner = {
      domain: claimed.owner_domain as AssetOwner['domain'], type: claimed.owner_type as string,
      id: claimed.owner_id as string, slot: claimed.owner_slot as string,
    };
    const kind = claimed.kind as AssetKind;
    if (actor.kind === 'staff') {
      const current = await access.resolveStoredStaffSession(actor.userId, actor.sessionId);
      if (!current.permissions.includes(actor.requiredCapability)) throw new MediaError(403, 'Media owner denied');
    } else if (!await authorizers[owner.domain]?.authorizeUpload(owner, kind, actor)) {
      throw new MediaError(403, 'Media owner denied');
    }
    return {
      id: claimed.id as string,
      owner,
      kind,
      filename: claimed.filename as string,
      mime: claimed.mime as string,
      size: Number(claimed.byte_size),
      actor,
    };
  }

  async function receiveUpload(
    intent: ClaimedUploadIntent,
    stream: AsyncIterable<Uint8Array>,
    signal?: AbortSignal,
  ): Promise<StagedAsset> {
    const spooled = await spoolUpload(stream, {
      declaredSize: intent.size, maxBytes: config.uploadMaxBytes,
      sniffBytes: config.uploadSniffBytes, signal,
    });
    try {
      return await media.stageUpload({
        owner: intent.owner, kind: intent.kind, filename: intent.filename, declaredMime: intent.mime,
        path: spooled.path, sniff: spooled.sniff, size: spooled.size, actor: intent.actor,
      });
    } finally { await spooled.cleanup(); }
  }

  return { createUploadIntent, claimIntent, receiveUpload };
}

export type UploadIntentService = ReturnType<typeof createUploadIntentService>;
