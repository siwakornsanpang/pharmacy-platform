import { parseArgs } from 'node:util';
import { emitKeypressEvents } from 'node:readline';
import { createDatabase } from '../src/db/client';
import { createInitialAdmin } from '../src/modules/access/bootstrap';
export function hiddenPassword(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error('Interactive terminal required');
  return new Promise((resolve, reject) => {
    let password = '';
    const wasRaw = process.stdin.isRaw;
    const cleanup = () => {
      process.stdin.off('keypress', keypress);
      process.stdin.off('end', cancelled);
      process.off('SIGINT', cancelled);
      process.off('SIGTERM', cancelled);
      process.off('SIGHUP', cancelled);
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      process.stdout.write('\n');
    };
    const cancelled = () => { password = ''; cleanup(); reject(new Error('Cancelled')); };
    const keypress = (text: string | undefined, key: {
      name?: string;
      ctrl?: boolean;
    }) => {
      if (key.ctrl && (key.name === 'c' || key.name === 'd'))
        return cancelled();
      if (key.name === 'return' || key.name === 'enter') {
        const result = password;
        password = '';
        cleanup();
        resolve(result);
      }
      else if (key.name === 'backspace')
        password = Array.from(password).slice(0, -1).join('');
      else if (text && !key.ctrl && !/[\x00-\x1f\x7f]/.test(text))
        password += text;
    };
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('keypress', keypress);
    process.stdin.once('end', cancelled);
    process.once('SIGINT', cancelled);
    process.once('SIGTERM', cancelled);
    process.once('SIGHUP', cancelled);
    process.stdout.write('Initial admin password (hidden): ');
  });
}
export async function main(): Promise<void> {
  try {
    const { values } = parseArgs({ options: { username: { type: 'string' }, 'display-name': { type: 'string' } }, strict: true, allowPositionals: false });
    if (!values.username || !values['display-name'])
      throw new Error('Missing identity');
    const value = process.env.MIGRATION_DATABASE_URL?.trim();
    if (!value)
      throw new Error('Missing migration database URL');
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !/^\/[^/]+$/.test(url.pathname) || !decodeURIComponent(url.pathname.slice(1)).trim() || url.hash)
      throw new Error('Invalid migration database URL');
    let password = await hiddenPassword();
    const db = createDatabase(value);
    try {
      await createInitialAdmin({ username: values.username, displayName: values['display-name'], password }, { db, clock: () => new Date() });
    }
    finally {
      password = '';
      await db.close();
    }
    console.log('Initial staff admin created');
  }
  catch {
    console.error('Initial staff admin creation failed');
    process.exitCode = 1;
  }
}
if (require.main === module)
  void main();
