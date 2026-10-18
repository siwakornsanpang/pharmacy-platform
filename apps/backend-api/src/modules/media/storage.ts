import { createReadStream } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import type { BackendConfig } from '../../config/server';

export interface StorageUpload {
  objectKey: string;
  mime: string;
  size: number;
  path: string;
  visibility: 'public' | 'private';
}
export interface MediaStorage {
  uploads: StorageUpload[];
  signs: { objectKey: string; expiresAt: Date; url: string }[];
  deletes: string[];
  upload(input: StorageUpload): Promise<void>;
  sign(objectKey: string, expiresAt: Date): Promise<string>;
  delete(objectKey: string): Promise<void>;
}

export function fakeStorage(): MediaStorage {
  const uploads: StorageUpload[] = [];
  const signs: { objectKey: string; expiresAt: Date; url: string }[] = [];
  const deletes: string[] = [];
  return {
    uploads, signs, deletes,
    async upload(input) { uploads.push(input); },
    async sign(objectKey, expiresAt) {
      const url = `https://storage.example.test/signed/${objectKey}?exp=${expiresAt.toISOString()}`;
      signs.push({ objectKey, expiresAt, url });
      return url;
    },
    async delete(objectKey) { deletes.push(objectKey); },
  };
}

export function supabaseStorage(config: BackendConfig): MediaStorage {
  const client = createClient(config.supabaseUrl, config.supabaseKey);
  return {
    uploads: [], signs: [], deletes: [],
    async upload(input) {
      const bucket = input.visibility === 'public' ? 'public-media' : 'private-media';
      const stream = createReadStream(input.path);
      try {
        const { error } = await client.storage.from(bucket).upload(input.objectKey, stream, {
          contentType: input.mime, upsert: false, duplex: 'half',
        });
        if (error) throw error;
      } finally { stream.destroy(); }
    },
    async sign(objectKey, expiresAt) {
      const ttl = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
      const { data, error } = await client.storage.from('private-media').createSignedUrl(objectKey, ttl);
      if (error || !data?.signedUrl) throw error ?? new Error('Missing signed URL');
      return data.signedUrl;
    },
    async delete(objectKey) {
      await client.storage.from('private-media').remove([objectKey]);
    },
  };
}
