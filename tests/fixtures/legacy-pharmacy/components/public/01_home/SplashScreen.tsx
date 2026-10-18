'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './SplashScreen.module.css';

interface PopupItem {
    id: string;
    url: string;
    title: string;
    active: boolean;
    order: number;
}

interface SplashScreenProps {
    popups: PopupItem[];
}

export default function SplashScreen({ popups }: SplashScreenProps) {
    // Start false to prevent server-client hydration mismatch or white screen on refresh
    const [visible, setVisible] = useState(false);
    const [closing, setClosing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [nextIndex, setNextIndex] = useState<number | null>(null);
    const [transitioning, setTransitioning] = useState(false);
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (popups.length === 0) return;
        const hideForever = localStorage.getItem('splash_hide_forever');
        const seenSession = sessionStorage.getItem('splash_shown');
        if (!hideForever && !seenSession) {
            setVisible(true);
            sessionStorage.setItem('splash_shown', '1');
        }
    }, [popups]);

    const goToSlide = useCallback((indexOrUpdater: number | ((prev: number) => number)) => {
        setCurrentIndex(prev => {
            const newIndex = typeof indexOrUpdater === 'function' ? indexOrUpdater(prev) : indexOrUpdater;
            if (newIndex === prev) return prev;
            if (!transitioning) {
                setTransitioning(true);
                setNextIndex(newIndex);
                setTimeout(() => {
                    setCurrentIndex(newIndex);
                    setNextIndex(null);
                    setTransitioning(false);
                }, 700);
            }
            return prev;
        });
        if (intervalRef.current) clearInterval(intervalRef.current);
    }, [transitioning]);

    useEffect(() => {
        if (!visible || popups.length <= 1) return;
        intervalRef.current = setInterval(() => {
            setCurrentIndex(prev => {
                const next = (prev + 1) % popups.length;
                setNextIndex(next);
                setTransitioning(true);
                setTimeout(() => {
                    setCurrentIndex(next);
                    setNextIndex(null);
                    setTransitioning(false);
                }, 700);
                return prev;
            });
        }, 5000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [visible, popups.length]);

    const dismiss = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
        if (e) {
            const btn = e.currentTarget;
            const rect = btn.getBoundingClientRect();
            const ripple = { id: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top };
            setRipples(prev => [...prev, ripple]);
            setTimeout(() => setRipples(prev => prev.filter(r => r.id !== ripple.id)), 800);
        }

        // Save preference if checkbox is checked
        if (dontShowAgain) {
            localStorage.setItem('splash_hide_forever', '1');
        }

        setClosing(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(() => {
            setVisible(false);
        }, 600);
    }, [dontShowAgain]);

    if (!visible || popups.length === 0) return null;

    const current = popups[currentIndex];
    const next = nextIndex !== null ? popups[nextIndex] : null;

    return (
        <div className={`${styles.overlay} ${closing ? styles.closing : ''}`}>
            {/* Shimmer particles */}
            <div className={styles.shimmerLayer} aria-hidden="true">
                {Array.from({ length: 20 }).map((_, i) => (
                    <span key={i} className={styles.shimmerParticle} style={{ '--i': i } as React.CSSProperties} />
                ))}
            </div>

            {/* Static splash images */}
            <div className={styles.imageLayer}>
                <img
                    src={current.url}
                    alt={current.title}
                    className={`${styles.bgImage} ${styles.bgImageActive} ${transitioning ? styles.bgImageFadeOut : ''}`}
                    draggable={false}
                />
                {next && (
                    <img
                        src={next.url}
                        alt={next.title}
                        className={`${styles.bgImage} ${styles.bgImageNext}`}
                        draggable={false}
                    />
                )}
            </div>

            {/* Gradient overlays */}
            <div className={styles.gradientTop} aria-hidden="true" />
            <div className={styles.gradientBottom} aria-hidden="true" />
            <div className={styles.vignette} aria-hidden="true" />

            {/* Glass streak highlight */}
            <div className={styles.glassStreak} aria-hidden="true" />

            {/* Close button */}
            <button className={styles.closeBtn} onClick={dismiss} aria-label="ปิด">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            {/* Bottom glass panel */}
            <div className={styles.glassPanel}>
                {current.title && (
                    <p className={styles.slideTitle}>{current.title}</p>
                )}

                {popups.length > 1 && (
                    <div className={styles.dots}>
                        {popups.map((_, i) => (
                            <button
                                key={i}
                                className={`${styles.dot} ${i === currentIndex ? styles.dotActive : ''}`}
                                onClick={() => goToSlide(i)}
                                aria-label={`สไลด์ ${i + 1}`}
                            />
                        ))}
                    </div>
                )}

                <button className={styles.enterBtn} onClick={dismiss}>
                    {ripples.map(r => (
                        <span key={r.id} className={styles.ripple} style={{ left: r.x, top: r.y } as React.CSSProperties} />
                    ))}
                    <span className={styles.enterBtnText}>
                        เข้าสู่เว็บไซต์
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </span>
                    <span className={styles.enterBtnShine} aria-hidden="true" />
                </button>

                {/* Don't show again checkbox option */}
                <label className={styles.dontShowLabel}>
                    <input
                        type="checkbox"
                        checked={dontShowAgain}
                        onChange={(e) => setDontShowAgain(e.target.checked)}
                        className={styles.dontShowCheckbox}
                    />
                    <span>ไม่ต้องแสดงหน้านี้อีก (Don't show this again)</span>
                </label>
            </div>
        </div>
    );
}
