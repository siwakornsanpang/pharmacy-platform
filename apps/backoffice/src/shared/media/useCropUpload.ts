'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssetId } from '@pharmacy/contracts/media';

export type CropUploadFn = (file: File, signal?: AbortSignal) => Promise<{ assetId: AssetId; url: string }>;

export function useCropUpload(upload: CropUploadFn): {
  pending: boolean;
  confirm(croppedFile: File): Promise<{ assetId: AssetId; url: string }>;
  cancel(): void;
} {
  const [pending, setPending] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const uploadRef = useRef(upload);
  uploadRef.current = upload;

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setPending(false);
  }, []);

  const confirm = useCallback(async (croppedFile: File) => {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setPending(true);
    try {
      return await uploadRef.current(croppedFile, next.signal);
    } finally {
      if (controller.current === next) {
        controller.current = null;
        setPending(false);
      }
    }
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  return { pending, confirm, cancel };
}
