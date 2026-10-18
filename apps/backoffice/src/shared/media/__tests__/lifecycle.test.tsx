// @vitest-environment jsdom
import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCropUpload } from '../useCropUpload';
import { useObjectUrl } from '../useObjectUrl';

afterEach(() => {
  vi.restoreAllMocks();
});

it('close_crop_aborts_upload_and_revokes_previous_blob', async () => {
  const revokeCalls: string[] = [];
  const created: string[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
    const url = `blob:test/${created.length + 1}`;
    created.push(url);
    return url;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url) => { revokeCalls.push(String(url)); });

  let uploadSignal: AbortSignal | undefined;
  let releaseUpload: (() => void) | undefined;
  const upload = vi.fn((file: File, signal?: AbortSignal) => new Promise<{ assetId: string; url: string }>((_resolve, reject) => {
    uploadSignal = signal;
    signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
    releaseUpload = () => reject(new Error('still pending'));
  }));

  function Probe() {
    const [blob, setBlob] = useState<Blob | null>(new Blob([new Uint8Array([1])]));
    const preview = useObjectUrl(blob);
    const { confirm, cancel } = useCropUpload(upload);
    return (
      <div>
        <div data-testid="preview">{preview}</div>
        <button type="button" onClick={() => { void confirm(new File([new Uint8Array([1])], 'crop.jpg', { type: 'image/jpeg' })).catch(() => undefined); }}>start</button>
        <button type="button" onClick={() => { cancel(); setBlob(null); }}>close</button>
      </div>
    );
  }

  render(<Probe />);
  await waitFor(() => expect(screen.getByTestId('preview').textContent).toBe('blob:test/1'));
  fireEvent.click(screen.getByRole('button', { name: 'start' }));
  await waitFor(() => expect(upload).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'close' }));
  await waitFor(() => expect(uploadSignal?.aborted).toBe(true));
  expect(revokeCalls).toEqual(created);
  releaseUpload?.();
});
