import { authJson, clearStaffCookies, getVerifiedStaff, StaffSessionError } from '@/lib/auth/session';

export async function GET() {
  try {
    const user = await getVerifiedStaff();
    return user ? authJson(user) : clearStaffCookies(authJson(null, 401));
  } catch (error) {
    if (!(error instanceof StaffSessionError)) throw error;
    return authJson({ message: error.message }, error.status);
  }
}
