import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AcademyCourseDetail, AcademyMemberActor } from '@pharmacy/contracts/academy';
import { buildApp } from '../../src/app';
import { countActiveEnrollments, countPaidOrders, readPublishedCourse } from '../../src/modules/academy';
import { accessFixture, fakePassword, seedStaff } from '../fixtures/access';
import { fakeStorage } from '../../src/modules/media/storage';

export const academyMember: AcademyMemberActor = {
  kind: 'pharmacy-mock', subject: '11111', pharmacistLicense: '11111', displayName: 'Fixture',
};

const localConnection = resolve(__dirname, '../../../../.superpowers/test-postgres/connection.json');

export async function academyFixture() {
  if (!process.env.TEST_DATABASE_URL && !existsSync(localConnection))
    throw new Error('TEST_DATABASE_URL is required; DATABASE_URL fallback is not allowed');
  if (process.env.TEST_DATABASE_URL && process.env.DATABASE_URL && process.env.TEST_DATABASE_URL === process.env.DATABASE_URL)
    throw new Error('TEST_DATABASE_URL must not reuse DATABASE_URL');
  const fixture = await accessFixture();
  try {
    const published = (await fixture.db.query(
      `INSERT INTO academy_courses(title,status,price,format,audience,is_featured,published_at)
       VALUES('Published fixture','published','0','online','all',false,$1) RETURNING id`,
      [fixture.clock()],
    )).rows[0]!;
    const draft = (await fixture.db.query(
      `INSERT INTO academy_courses(title,status,price,format,audience,is_featured)
       VALUES('Draft fixture','draft','0','online','all',false) RETURNING id`,
    )).rows[0]!;
    const staff = await seedStaff(fixture.db, 'academy_editor');
    await fixture.db.query("INSERT INTO permissions(key,label) VALUES ('manage_academy','Academy') ON CONFLICT DO NOTHING");
    await fixture.db.query("INSERT INTO role_permissions(role,permission_key,is_active) VALUES ('academy_editor','manage_academy',true)");
    const storage = fakeStorage();
    const app = await buildApp({ ...fixture, storage });
    const login = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { username: staff.username, password: fakePassword },
    });
    if (login.statusCode !== 200) throw new Error(login.body);
    const authorization = `Bearer ${(login.json() as { token: string }).token}`;
    return {
      app, db: fixture.db, config: fixture.config, clock: fixture.clock, staff, authorization, storage,
      publishedId: Number(published.id), draftId: Number(draft.id),
      memberHeaders: (key?: string) => ({
        'x-academy-bridge': fixture.config.academyBridgeKey,
        ...(key ? { 'idempotency-key': key } : {}),
      }),
      staffHeaders: (key?: string) => ({
        authorization,
        ...(key ? { 'idempotency-key': key } : {}),
      }),
      countPaidOrders: (license: string, courseId: number) => countPaidOrders(fixture.db, license, courseId),
      countActiveEnrollments: (license: string, courseId: number) => countActiveEnrollments(fixture.db, license, courseId),
      readCourse: (id: number) => readPublishedCourse(fixture.db, id) as Promise<AcademyCourseDetail | null>,
      cleanup: async () => { await app.close(); await fixture.cleanup(); },
    };
  } catch (error) {
    await fixture.cleanup();
    throw error;
  }
}

export function localTestDatabaseUrl(): string | undefined {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  if (!existsSync(localConnection)) return undefined;
  return JSON.parse(readFileSync(localConnection, 'utf8')).testDatabaseUrl as string;
}
