import inventory from './route-inventory.json';
export type RouteCase = { app: string; route: string; pattern: string; alias?: string | null; role: string; state: string; fixture: string; viewport: string; captureScreenshot: boolean; expectedFinalRoute?: string; pending: boolean };
export const routeManifest: RouteCase[] = inventory;
