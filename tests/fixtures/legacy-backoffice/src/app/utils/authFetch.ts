// src/app/utils/authFetch.ts
import Cookies from 'js-cookie';

/**
 * Wrapper รอบ fetch() ที่ใส่ JWT Authorization header อัตโนมัติ
 * ถ้า token หมดอายุ (401) จะ redirect ไปหน้า login
 * 
 * ใช้แทน fetch() ปกติ:
 *   const res = await authFetch(`${API_URL}/news`);
 *   const res = await authFetch(`${API_URL}/news`, { method: 'POST', body: formData });
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = Cookies.get('auth_token');

  // สร้าง headers ใหม่ โดยรวม Authorization เข้าไป
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // ถ้าไม่ใช่ FormData ให้ตั้ง Content-Type เป็น JSON (ถ้ายังไม่มี)
  // แต่ถ้าเป็น FormData ต้อง **ไม่ตั้ง** Content-Type (browser จัดการ boundary เอง)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // ถ้า 401 → Token หมดอายุหรือไม่ถูกต้อง → redirect ไป login
  if (res.status === 401) {
    // ลบ cookies ทั้งหมด
    Cookies.remove('auth_token', { path: '/' });
    Cookies.remove('user_role', { path: '/' });
    Cookies.remove('user_display_name', { path: '/' });
    Cookies.remove('user_id', { path: '/' });
    
    // Redirect (ทำงานทั้ง client-side)
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  return res;
}
