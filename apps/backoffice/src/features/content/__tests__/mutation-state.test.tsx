// @vitest-environment jsdom
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ApiError } from '@pharmacy/http';
import { useLatestRequest } from '@/shared/async/useLatestRequest';
import { useCropUpload } from '@/shared/media/useCropUpload';

const thaiDenied = 'ไม่สามารถโหลดข้อมูลข่าวได้';

afterEach(() => cleanup());

function ToggleProbe({ save }: { save: (next: boolean) => Promise<void> }) {
  const [on, setOn] = useState(true);
  const [error, setError] = useState('');
  const [successPopupCalls, setSuccessPopupCalls] = useState(0);
  return (
    <div>
      <div data-testid="value">{on ? 'on' : 'off'}</div>
      <div data-testid="success">{successPopupCalls}</div>
      {error ? <div>{error}</div> : null}
      <button
        type="button"
        onClick={async () => {
          const previous = on;
          setOn(!previous);
          try {
            await save(!previous);
            setSuccessPopupCalls((count) => count + 1);
          } catch {
            setOn(previous);
            setError(thaiDenied);
          }
        }}
      >
        toggle
      </button>
    </div>
  );
}

function UploadProbe({ upload }: { upload: (file: File, signal?: AbortSignal) => Promise<{ assetId: string; url: string }> }) {
  const { confirm } = useCropUpload(upload);
  const [successPopupCalls, setSuccessPopupCalls] = useState(0);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await confirm(new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' }));
          setSuccessPopupCalls((count) => count + 1);
        } catch { /* keep previous UI */ }
      }}
    >
      upload {successPopupCalls}
    </button>
  );
}

it('403_mutation_keeps_previous_value_and_Thai_error', async () => {
  const save = vi.fn(async () => { throw new ApiError('http', 403); });
  render(<ToggleProbe save={save} />);
  expect(screen.getByTestId('value').textContent).toBe('on');
  fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
  await waitFor(() => expect(screen.getByText(thaiDenied)).toBeTruthy());
  expect(screen.getByTestId('value').textContent).toBe('on');
  expect(screen.getByTestId('success').textContent).toBe('0');
});

it('upload_error_not_success', async () => {
  const upload = vi.fn(async () => { throw new ApiError('http', 503); });
  render(<UploadProbe upload={upload} />);
  fireEvent.click(screen.getByRole('button', { name: /upload/ }));
  await waitFor(() => expect(upload).toHaveBeenCalled());
  expect(screen.getByRole('button', { name: 'upload 0' })).toBeTruthy();
});

it('failed_toggle_rolls_back', async () => {
  const save = vi.fn(async () => { throw new ApiError('http', 403); });
  render(<ToggleProbe save={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(screen.getByTestId('value').textContent).toBe('on');
  expect(screen.getByTestId('success').textContent).toBe('0');
});

it('useLatestRequest ignores a slower first result', async () => {
  let settleA: ((value: string) => void) | undefined;
  const load = vi.fn(async (_signal: AbortSignal, query: string) => {
    if (query === 'A') return new Promise<string>((resolve) => { settleA = resolve; });
    return 'B';
  });
  function Probe() {
    const [query, setQuery] = useState('A');
    const { data } = useLatestRequest((signal) => load(signal, query), [query]);
    return (
      <div>
        <div data-testid="rendered">{data}</div>
        <button type="button" onClick={() => setQuery('B')}>next</button>
      </div>
    );
  }
  render(<Probe />);
  fireEvent.click(screen.getByRole('button', { name: 'next' }));
  await waitFor(() => expect(screen.getByTestId('rendered').textContent).toBe('B'));
  settleA?.('A');
  await waitFor(() => expect(screen.getByTestId('rendered').textContent).toBe('B'));
});
