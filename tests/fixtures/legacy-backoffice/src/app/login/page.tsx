// src/app/login/page.tsx
"use client";

import Cookies from 'js-cookie';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Eye, EyeOff, LogIn, LayoutDashboard } from 'lucide-react';

// ✅ Import Styles
import styles from './LoginPage.module.css';
import { getDefaultPage } from '@/app/config/roles';
import { isLocalUiBypass, LOCAL_UI_USER } from '@/app/utils/localUi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const LOCAL_UI = isLocalUiBypass();

function setAuthCookies(user: {
  token: string;
  role: string;
  displayName: string;
  id: string | number;
}) {
  const cookieOptions = { expires: 1, path: '/' as const };
  Cookies.set('auth_token', user.token, cookieOptions);
  Cookies.set('user_role', user.role, cookieOptions);
  Cookies.set('user_display_name', user.displayName, cookieOptions);
  Cookies.set('user_id', String(user.id), cookieOptions);
}

export default function LoginPage() {
  const router = useRouter();
  
  // States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const enterLocalUi = () => {
    setAuthCookies(LOCAL_UI_USER);
    router.push('/backoffice');
  };

  // Function Login — เรียก API จริง
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
        setIsLoading(false);
        return;
      }

      setAuthCookies({
        token: data.token,
        role: data.user.role,
        displayName: data.user.displayName,
        id: data.user.id,
      });

      // ไปหน้าตาม role
      router.push(getDefaultPage(data.user.role));

    } catch {
      if (LOCAL_UI) {
        // Local UI mode: API ล่มก็ยังเข้าดู layout ได้
        enterLocalUi();
        return;
      }
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      
      {/* Login Card */}
      <div className={styles.card}>
        
        {/* Header */}
        <div className={styles.header}>
            <div className={styles.logoBox}>
                <img src={"/favicon.ico"} alt="" />
            </div>
            <h2 className={styles.title}>ยินดีต้อนรับ</h2>
            <p className={styles.subtitle}>เข้าสู่ระบบสภาเภสัชกรรม</p>
        </div>

        {/* Form Input */}
        <div className={styles.formContainer}>
          <form onSubmit={handleLogin} className={styles.form}>
            
            {/* Username Input */}
            <div className={styles.formGroup}>
              <label className={styles.label}>ชื่อผู้ใช้งาน</label>
              <div className={styles.inputWrapper}>
                <div className={styles.inputIcon}>
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required={!LOCAL_UI}
                  className={styles.inputField}
                  placeholder="กรอกชื่อผู้ใช้งาน"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className={styles.formGroup}>
              <label className={styles.label}>รหัสผ่าน</label>
              <div className={styles.inputWrapper}>
                <div className={styles.inputIcon}>
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required={!LOCAL_UI}
                  className={`${styles.inputField} pr-10`}
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {/* ปุ่มลูกตา Show/Hide Password */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.togglePassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className={styles.optionsRow}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} />
                <span>จำรหัสผ่าน</span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className={styles.errorMessage}>
                 <span>⚠️ {error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`${styles.submitButton} ${isLoading ? styles.loadingBtn : styles.activeBtn}`}
            >
              {isLoading ? (
                <>กำลังเข้าสู่ระบบ...</> 
              ) : (
                <> <LogIn size={18} /> เข้าสู่ระบบ </>
              )}
            </button>

            {LOCAL_UI && (
              <button
                type="button"
                className={`${styles.submitButton} ${styles.activeBtn}`}
                style={{ marginTop: '0.75rem', background: '#555900' }}
                onClick={enterLocalUi}
              >
                <LayoutDashboard size={18} /> เข้าดู UI (Local — ไม่ใช้ API)
              </button>
            )}

          </form>
        </div>
        
        {/* Footer */}
        <div className={styles.footer}>
         &copy; สำนักงานเลขาธิการ สภาเภสัชกรรม อาคารมหิตลาธิเบศร
         {LOCAL_UI && (
           <div style={{ marginTop: 8, color: '#555900', fontWeight: 600 }}>
             Local UI mode เปิดอยู่
           </div>
         )}
        </div>

      </div>
    </div>
  );
}
