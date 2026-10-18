import { expect, it, vi } from 'vitest';

const fire = vi.fn(async () => ({}));
vi.mock('sweetalert2', () => ({ default: { fire } }));

const { mutationOk, mutationErr } = await import('../mutation-alert');

it('shows the result before reloading', async () => {
  const reload = vi.fn();
  await mutationOk('save', reload);
  expect(fire.mock.invocationCallOrder[0]).toBeLessThan(reload.mock.invocationCallOrder[0]);
});

it('does not reload after an error', async () => {
  const reload = vi.fn();
  await mutationErr();
  expect(reload).not.toHaveBeenCalled();
});
