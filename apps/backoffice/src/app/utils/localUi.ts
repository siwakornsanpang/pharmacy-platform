/**
 * Local UI bypass is never enabled from the browser bundle on this POC.
 * Isolated local development is gated by server-only ALLOW_LOCAL_UI_BYPASS.
 */
export function isLocalUiBypass(): boolean {
  return false;
}

export const LOCAL_UI_USER = {
  token: '',
  role: 'viewer',
  displayName: 'Local UI',
  id: '0',
} as const;
