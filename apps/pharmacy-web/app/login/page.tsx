"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, Lock, EyeOff, ChevronLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { safeReturnTo } from "@/lib/navigation/safe-return-to";
import styles from "./login.module.css";

export default function LoginPage() {
  const auth = useAuth();
  const [step, setStep] = useState<"login" | "otp">("login");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loginError, setLoginError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const MOCK_ID = "ph123";
  const MOCK_PASSWORD = "12345";
  const MOCK_OTP = "111222";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/pharmacy/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ license: id, password }) });
      const payload = await response.json() as { challengeId?: string; title?: string };
      if (!response.ok || !payload.challengeId) throw new Error(payload.title || "ไม่สามารถเข้าสู่ระบบได้");
      setChallengeId(payload.challengeId);
      setPassword("");
      setStep("otp");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "ไม่สามารถเข้าสู่ระบบได้");
    } finally { setSubmitting(false); }
  };

  useEffect(() => {
    if (step === "otp") {
      // Small timeout to ensure the DOM has updated and element is rendered
      setTimeout(() => {
        const firstOtpInput = document.getElementById("otp-0");
        firstOtpInput?.focus();
      }, 50);
    }
  }, [step]);

  const handleVerifyOtp = async () => {
    const enteredOtp = otp.join("");
    setOtpError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/pharmacy/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ challengeId, otp: enteredOtp }) });
      const payload = await response.json() as { title?: string };
      if (!response.ok) throw new Error(payload.title || "รหัส OTP ไม่ถูกต้อง");
      if (!(await auth.refresh())) throw new Error("ไม่สามารถยืนยัน session ได้");
      window.location.href = safeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบและระบุอีกครั้ง");
    } finally { setSubmitting(false); }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className={`${styles.loginWrapper} ThaiFont`}>
      {/* Login Card Container */}
      <main className={styles.main}>
        <div className={styles.loginCard}>
          {/* Left Side: Illustration/Image */}
          <div className={styles.cardLeft}>
            <Image
              src="/images/public/login/Column.png"
              alt="Pharmacist"
              fill
              className={styles.pharmacistImg}
              priority
            />
          </div>

          {/* Right Side: Content */}
          <div className={styles.cardRight}>
            {step === "login" ? (
              <>
                <div className={styles.formHeader}>
                  <Image
                    src="/images/public/icon.jpg"
                    alt="Logo"
                    width={80}
                    height={80}
                    className={styles.formLogo}
                  />
                  <h2>ระบบบริการผู้ประกอบวิชาชีพเภสัชกรรม</h2>
                  <div className={styles.mockBadge}>
                    <div className={styles.mockItem}>
                      <span className={styles.mockLabel}>เลขที่ใบอนุญาต:</span>
                      <span className={styles.mockValue}>{MOCK_ID}</span>
                    </div>
                    <div className={styles.mockItem}>
                      <span className={styles.mockLabel}>รหัสผ่าน:</span>
                      <span className={styles.mockValue}>{MOCK_PASSWORD}</span>
                    </div>
                  </div>
                </div>

                <form className={styles.form} onSubmit={handleLogin}>
                  <div className={styles.inputGroup}>
                    <div className={styles.inputWrapper}>
                      <User className={styles.inputIcon} size={20} />
                      <input
                        id="login-id"
                        type="text"
                        placeholder="ระบุเลขที่ใบอนุญาต ฯ"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            document.getElementById('login-password')?.focus();
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <div className={styles.inputWrapper}>
                      <Lock className={styles.inputIcon} size={20} />
                      <input
                        id="login-password"
                        type="password"
                        placeholder="รหัสผ่าน"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            document.getElementById('login-id')?.focus();
                          }
                        }}
                      />
                      <EyeOff className={styles.eyeIcon} size={20} />
                    </div>
                  </div>

                  {loginError && <p className={styles.errorMessage}>{loginError}</p>}

                  <button type="submit" className={styles.submitBtn} disabled={submitting}>
                    เข้าสู่ระบบ
                  </button>

                  <div className={styles.formLinks}>
                    <Link href="/register">เข้าสู่ระบบครั้งแรก</Link>
                    <Link href="/forgot-password">ลืมรหัสผ่าน</Link>
                  </div>

                  {/*
                  <div className={styles.dividerOr}>
                    <span>หรือ</span>
                  </div>

                  <div className={styles.altLogin}>
                    <button type="button" className={`${styles.altBtn} ${styles.blueBtn}`}>
                      <Image src="/images/public/login/thaid.png" alt="ThaiID" width={32} height={32} />
                      เข้าสู่ระบบด้วย ThaiID
                    </button>

                    <button type="button" className={`${styles.altBtn} ${styles.lightBlueBtn}`}>
                      <Image src="/images/public/login/paotang.png" alt="PaoTang" width={32} height={32} />
                      เข้าสู่ระบบด้วย เป๋าตัง
                    </button>

                    <button type="button" className={`${styles.altBtn} ${styles.greenBtn}`}>
                      <Image src="/images/public/login/tangrat.png" alt="TangRat" width={32} height={32} />
                      เข้าสู่ระบบด้วย ทางรัฐ
                    </button>
                  </div>
                  */}
                </form>
              </>
            ) : (
              <div className={styles.otpContent}>
                <h2 className={styles.otpTitle}>ยืนยันรหัส OTP</h2>
                <p className={styles.otpSubtitle}>
                  กรอกรหัสยืนยัน OTP ที่ส่งไปยังเบอร์โทรศัพท์มือถือ<br />
                  XXX-XXX-0440 รหัสอ้างอิง : A0990
                </p>
                <div className={styles.mockBadge}>
                  <div className={styles.mockItem}>
                    <span className={styles.mockLabel}>Mock OTP:</span>
                    <span className={styles.mockValue} style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{MOCK_OTP}</span>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerifyOtp();
                  }}
                >
                  <div className={styles.otpInputGroup}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        maxLength={1}
                        className={styles.otpInput}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        autoComplete="off"
                      />
                    ))}
                  </div>

                  {otpError && <p className={styles.otpErrorMessage}>{otpError}</p>}

                  <button type="submit" className={styles.submitBtn} disabled={submitting}>
                    ยืนยัน OTP
                  </button>
                </form>

                <p className={styles.resendText}>
                  ยังไม่ได้รับรหัส? <span className={styles.resendLink}>ส่งรหัสอีกครั้ง</span>
                </p>

                <div
                  className={styles.backToLogin}
                  onClick={() => {
                    setStep("login");
                    setOtpError("");
                    setChallengeId("");
                    setOtp(["", "", "", "", "", ""]);
                  }}
                >
                  <ChevronLeft size={20} />
                  <span>กลับหน้าเข้าสู่ระบบ</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span className={styles.footerText}>ผ่านการรับรองมาตรฐานโดย</span>
          <div className={styles.footerLogos}>
            <Image src="/images/public/login/etda.png" alt="ETDA" width={120} height={35} className={styles.etdaLogo} />
            <Image src="/images/public/login/dopa.png" alt="Department of Provincial Administration" width={260} height={40} className={styles.dopaLogo} />
          </div>
        </div>
      </footer>
      */}
    </div>
  );
}
