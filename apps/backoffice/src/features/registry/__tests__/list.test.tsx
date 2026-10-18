// @vitest-environment jsdom
import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useLatestRequest } from '@/shared/async/useLatestRequest';
import { mapPharmacistPage } from '../mapping';

function RegistryProbe({ load }: { load: (signal: AbortSignal, query: string) => Promise<{ query: string }> }) {
  const [query, setQuery] = useState('A');
  const { data } = useLatestRequest((signal) => load(signal, query), [query]);
  return (
    <div>
      <div data-testid="rendered">{data?.query}</div>
      <button type="button" onClick={() => setQuery('B')}>search B</button>
    </div>
  );
}

it('older_query_cannot_replace_newer_registry_page', async () => {
  let settleA: ((value: { query: string }) => void) | undefined;
  const load = vi.fn(async (_signal: AbortSignal, query: string) => {
    if (query === 'A') return new Promise<{ query: string }>((resolve) => { settleA = resolve; });
    return { query: 'B' };
  });
  render(<RegistryProbe load={load} />);
  fireEvent.click(screen.getByRole('button', { name: 'search B' }));
  await waitFor(() => expect(screen.getByTestId('rendered').textContent).toBe('B'));
  settleA?.({ query: 'A' });
  await waitFor(() => expect(screen.getByTestId('rendered').textContent).toBe('B'));
});

it('maps admin pharmacist pages without dropping address', () => {
  const mapped = mapPharmacistPage({
    items: [{ id: 9, firstName: 'สมชาย', lastName: 'ใจดี', licenseNumber: '123', province: 'Bangkok', status: 'active', address: 'private-street' }],
    total: 1,
  });
  expect(mapped.items[0]).toMatchObject({ id: '9', firstName: 'สมชาย', licenseNumber: '123', address: 'private-street' });
  expect(mapped.total).toBe(1);
});
