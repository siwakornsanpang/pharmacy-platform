"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./CouncildirectoryContent.module.css";

export interface CouncilTerm {
    id: number;
    term: string;
    startYear: string;
    endYear: string; 
    presidentName: string;
    presidentImage: string;
    secretaryName: string;
    secretaryImage: string;
}

interface Props {
    initialData: CouncilTerm[];
}

export default function CouncildirectoryContent({
    initialData = [],
}: Props) {
    const [data, setData] = useState<CouncilTerm[]>(initialData);
    const [loading, setLoading] = useState(initialData.length === 0);
    const [selectedTerm, setSelectedTerm] = useState<CouncilTerm | null>(null);

    const timelineRef = useRef<HTMLDivElement>(null);

    // Sort descending by ID/Term to show latest on the left
    const sortedData = [...data].sort((a, b) => {
        const termA = parseInt(a.term) || 0;
        const termB = parseInt(b.term) || 0;
        if (termA !== termB) return termB - termA;
        return b.id - a.id;
    });

    // Fetch on client if SSR data is missing
    useEffect(() => {
        if (initialData.length > 0) {
            setLoading(false);
            return;
        }

        async function fetchHistory() {
            try {
                setLoading(true);
                const res = await fetch("/api/proxy/history", {
                    cache: "no-store",
                });
                if (!res.ok) throw new Error("Failed to fetch");
                const json = await res.json();
                setData(Array.isArray(json) ? json : []);
            } catch (error) {
                console.error("Client fetch error:", error);
                setData([]);
            } finally {
                setLoading(false);
            }
        }
        fetchHistory();
    }, [initialData]);

    // Initialize with the latest term if available
    useEffect(() => {
        if (sortedData.length > 0 && !selectedTerm) {
            setSelectedTerm(sortedData[0]);
        }
    }, [sortedData, selectedTerm]);

    const scrollTimeline = (direction: "left" | "right") => {
        if (timelineRef.current) {
            const scrollAmount = 240;
            timelineRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
        }
    };

    useEffect(() => {
        if (!selectedTerm || !timelineRef.current) return;
        const target = timelineRef.current.querySelector<HTMLElement>(`[data-term-id="${selectedTerm.id}"]`);
        const narrow = window.matchMedia("(max-width: 640px)").matches;
        target?.scrollIntoView({
            behavior: "smooth",
            inline: narrow ? "nearest" : "center",
            block: "nearest",
        });
    }, [selectedTerm]);

    // Helper: wrap last word (family name) in a span to prevent mid-word breaks
    const renderPersonName = (fullName?: string | null) => {
        if (!fullName) return null;
        const parts = fullName.trim().split(/\s+/);
        if (parts.length === 1) return fullName;
        const last = parts.pop();
        const first = parts.join(" ");
        return (
            <>
                <span>{first} </span>
                <span className={styles.familyName}>{last}</span>
            </>
        );
    };

    if (loading) {
        return (
            <section className={styles.wrapper}>
                <div className={styles.loading}>กำลังโหลดข้อมูล...</div>
            </section>
        );
    }

    return (
        <section className={styles.wrapper}>
            {/* EMPTY STATE */}
            {sortedData.length === 0 && (
                <div className={styles.emptyBox}>
                    ยังไม่มีข้อมูลทำเนียบสภาเภสัชกรรม
                </div>
            )}

            {/* TIMELINE SELECTOR */}
            {sortedData.length > 0 && (
                <div className={styles.timelineContainer}>
                    <div className={styles.timelineLabel}>เลือกวาระ</div>
                    <div className={styles.timelineWrapper}>
                        <button 
                            className={styles.scrollBtn} 
                            onClick={() => scrollTimeline("left")}
                            aria-label="เลื่อนซ้าย"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        
                        <div className={styles.timelineScroll} ref={timelineRef}>
                            <div className={styles.termsList}>
                                <div className={styles.timelineLine}></div>
                                {sortedData.map((item) => {
                                    const isActive = selectedTerm?.id === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={styles.termNode}
                                            data-term-id={item.id}
                                            aria-pressed={isActive}
                                            aria-label={`วาระที่ ${item.term} (${item.startYear} - ${item.endYear})`}
                                            onClick={() => setSelectedTerm(item)}
                                        >
                                            <div className={`${styles.termCard} ${isActive ? styles.activeCard : ""}`}>
                                                <span className={styles.termNodeLabel}>วาระที่</span>
                                                <span className={styles.termNodeNum}>{item.term}</span>
                                                <span className={styles.termNodeYears}>{item.startYear} - {item.endYear}</span>
                                            </div>
                                            <div className={`${styles.timelineDot} ${isActive ? styles.activeDot : ""}`}></div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button 
                            className={styles.scrollBtn} 
                            onClick={() => scrollTimeline("right")}
                            aria-label="เลื่อนขวา"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* DETAIL CARD */}
            {selectedTerm && (
                <div key={selectedTerm.id} className={styles.detailCard}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.termTitle}>วาระที่ {selectedTerm.term}</h2>
                        <div className={styles.headerDivider}></div>
                        <div className={styles.headerRight}>
                            <div className={styles.committeeLabel}>คณะกรรมการสภาเภสัชกรรม</div>
                            <div className={styles.yearBadge}>
                                พ.ศ. {selectedTerm.startYear} - {selectedTerm.endYear}
                            </div>
                        </div>
                    </div>

                    <div className={styles.peopleGrid}>
                        {/* PRESIDENT */}
                        <div className={styles.personCard}>
                            <div className={styles.imageBox}>
                                <div className={styles.imageBoxDecoration}></div>
                                <img
                                    src={selectedTerm.presidentImage || "/images/placeholder-person.png"}
                                    alt={selectedTerm.presidentName}
                                />
                            </div>
                            <div className={styles.cardInfo}>
                                <div className={styles.roleBadge}>นายกสภาเภสัชกรรม</div>
                                <h3 className={styles.personName}>{renderPersonName(selectedTerm.presidentName)}</h3>
                                <div className={styles.nameUnderline}></div>
                            </div>
                        </div>

                        {/* SECRETARY */}
                        <div className={styles.personCard}>
                            <div className={styles.imageBox}>
                                <div className={styles.imageBoxDecoration}></div>
                                <img
                                    src={selectedTerm.secretaryImage || "/images/placeholder-person.png"}
                                    alt={selectedTerm.secretaryName}
                                />
                            </div>
                            <div className={styles.cardInfo}>
                                <div className={styles.roleBadge}>เลขาธิการสภาเภสัชกรรม</div>
                                <h3 className={styles.personName}>{renderPersonName(selectedTerm.secretaryName)}</h3>
                                <div className={styles.nameUnderline}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
