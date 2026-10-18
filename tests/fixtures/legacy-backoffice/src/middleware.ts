// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  
  // 1. ตรวจสอบว่ามี JWT Token ไหม?
  const token = request.cookies.get('auth_token')?.value

  // 2. ตรวจสอบว่า User กำลังจะเข้าโซนหวงห้ามไหม? (ขึ้นต้นด้วย /backoffice)
  const isProtectPath = request.nextUrl.pathname.startsWith('/backoffice')

  // 3. กฎเหล็ก: ถ้าจะเข้าโซนหวงห้าม แต่ไม่มี Token → ถีบกลับไปหน้า Login
  if (isProtectPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 4. ถ้ามี Token แล้ว แต่พยายามจะเข้าหน้า Login → ส่งไป Backoffice เลย
  if (request.nextUrl.pathname === '/login' && token) {
     return NextResponse.redirect(new URL('/backoffice', request.url))
  }

  // ถ้าผ่านทุกเงื่อนไข ก็เชิญเข้าได้
  return NextResponse.next()
}

// กำหนดว่า Middleware นี้จะทำงานกับเส้นทางไหนบ้าง
export const config = {
  matcher: ['/backoffice/:path*', '/login'],
}