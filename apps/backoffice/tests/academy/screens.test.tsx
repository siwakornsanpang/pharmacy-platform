// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { academyCommandKey, resetAcademyCommandKeys, reviewOrder } from '../../src/features/academy/api';
import { parseQuizText, serializeQuiz } from '../../src/features/academy/course-form-state';
import AcademyOrdersPage from '../../src/app/backoffice/module/academy/orders/page';

const csrf = 'a'.repeat(64);
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  resetAcademyCommandKeys();
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('keeps a failed staff order review from looking successful and reuses the intent key', async () => {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    if (url === '/api/auth/staff/csrf') return json({ csrfToken: csrf });
    if (url.startsWith('/api/backend/academy/admin/orders') && (init?.method ?? 'GET') === 'GET')
      return json([{ id: 4, courseTitle: 'course B', displayName: 'ภก. บี', pharmacistLicense: '22222', amount: '100', status: 'pending', slipUrl: null }]);
    if (url === '/api/backend/academy/admin/orders/4/approve') return json({ error: 'upstream_unavailable' }, 503);
    throw new Error(url);
  });
  render(<AcademyOrdersPage />);
  expect(await screen.findByText('course B')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'ยืนยัน' }));
  await waitFor(() => expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/approve'))).toBe(true));
  expect(screen.getByRole('button', { name: 'ยืนยัน' })).toBeEnabled();
  expect(new Headers(fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/approve'))?.[1]?.headers).has('authorization')).toBe(false);
});

it('reuses the same staff review key until the target changes', async () => {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url === '/api/auth/staff/csrf') return json({ csrfToken: csrf });
    return json({ error: 'denied' }, 403);
  });
  const intentKey = academyCommandKey('approve', 'order:8');
  await expect(reviewOrder(8, 'approve', intentKey)).rejects.toMatchObject({ status: 403 });
  await expect(reviewOrder(8, 'approve', academyCommandKey('approve', 'order:8'))).rejects.toMatchObject({ status: 403 });
  const sentKeys = fetchMock.mock.calls
    .filter((call) => String(call[0]).includes('/orders/8/approve'))
    .map((call) => new Headers(call[1]?.headers).get('idempotency-key') || new Headers(call[1]?.headers).get('Idempotency-Key'));
  expect(sentKeys).toEqual([intentKey, intentKey]);
  expect(academyCommandKey('approve', 'order:9')).not.toBe(intentKey);
});

it('serializes quiz blocks without losing the marked answer', () => {
  const text = serializeQuiz(parseQuizText('ข้อใดถูก\n- ผิด\n- ถูก*'));
  expect(text).toContain('ถูก*');
  expect(parseQuizText(text)[0]?.options.some((option) => option.correct)).toBe(true);
});
