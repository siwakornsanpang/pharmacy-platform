"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import styles from "./CommitteeContent.module.css";

export type CouncilMember = {
    id: number;
    prefix: string;
    name: string;
    position: string;
    type?: string;
    imageUrl: string;
    originalImageUrl?: string;
    order: number;
    background?: string;
};

interface CommitteeContentProps {
    initialMembers?: CouncilMember[];
}

const API_URL = "/api/proxy";

const INTRO_TEXT =
    "คณะกรรมการสภาเภสัชกรรม (มาตรา 15 แห่งพระราชบัญญัติวิชาชีพเภสัชกรรม พ.ศ. 2537) มีวาระอยู่ในตำแหน่งคราวละสามปี ประกอบด้วย กรรมการโดยตำแหน่ง กรรมการซึ่งได้รับแต่งตั้ง และกรรมการซึ่งได้รับเลือกตั้ง โดยสมาชิก";

function fullName(member: CouncilMember) {
    return `${member.prefix || ""}${member.name}`.trim();
}

function isPresident(member: CouncilMember) {
    const pos = (member.position || "").trim();
    return pos === "นายกสภาเภสัชกรรม";
}

export default function CommitteeContent({ initialMembers = [] }: CommitteeContentProps) {
    const [members, setMembers] = useState<CouncilMember[]>(initialMembers);
    const [selected, setSelected] = useState<CouncilMember | null>(null);
    const [loading, setLoading] = useState(initialMembers.length === 0);

    useEffect(() => {
        if (initialMembers.length > 0) {
            setLoading(false);
            return;
        }

        async function getCouncil() {
            try {
                setLoading(true);
                const cleanApiUrl = API_URL.replace(/\/$/, "");
                const res = await fetch(`${cleanApiUrl}/council`, { cache: "no-store" });
                if (!res.ok) throw new Error(`API error: ${res.status}`);

                const json = await res.json();
                const data: CouncilMember[] = Array.isArray(json)
                    ? json
                    : Array.isArray(json.data)
                      ? json.data
                      : [];

                setMembers(
                    data
                        .filter((item) => item?.id && item?.imageUrl)
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                );
            } catch (error) {
                console.error("Failed to fetch council:", error);
                setMembers([]);
            } finally {
                setLoading(false);
            }
        }

        getCouncil();
    }, [initialMembers]);

    const { president, others } = useMemo(() => {
        const sorted = [...members].sort((a, b) => {
            const typeRank = (t?: string) =>
                t === "elected" ? 0 : t === "appointed" ? 1 : 2;
            const tr = typeRank(a.type) - typeRank(b.type);
            if (tr !== 0) return tr;
            return (a.order || 0) - (b.order || 0);
        });

        const presidentMember = sorted.find(isPresident) || null;
        const rest = sorted.filter((m) => !presidentMember || m.id !== presidentMember.id);
        return { president: presidentMember, others: rest };
    }, [members]);

    useEffect(() => {
        if (!selected) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelected(null);
        };
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKey);
        };
    }, [selected]);

    if (loading) {
        return (
            <section className={styles.wrapper}>
                <div className={styles.loading}>กำลังโหลดข้อมูลกรรมการ...</div>
            </section>
        );
    }

    if (members.length === 0) {
        return null;
    }

    return (
        <section className={styles.wrapper}>
            <p className={`${styles.intro} ThaiFont`}>{INTRO_TEXT}</p>

            {president && (
                <div className={styles.presidentRow}>
                    <MemberCard member={president} size="lg" onSelect={setSelected} />
                </div>
            )}

            <div className={styles.grid}>
                {others.map((member) => (
                    <MemberCard
                        key={member.id}
                        member={member}
                        size="sm"
                        onSelect={setSelected}
                    />
                ))}
            </div>

            {selected && (
                <div className={styles.modalOverlay} onClick={() => setSelected(null)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={styles.closeButton}
                            onClick={() => setSelected(null)}
                            aria-label="ปิด"
                            type="button"
                        >
                            <X size={18} strokeWidth={2.5} />
                        </button>

                        <div className={styles.modalImageBox}>
                            <img
                                src={selected.imageUrl}
                                alt={fullName(selected)}
                                className={styles.modalPhoto}
                            />
                        </div>

                        <div className={styles.modalContent}>
                            <header className={styles.modalHeader}>
                                <h3 className="ThaiFont">{fullName(selected)}</h3>
                                <p className={`${styles.modalPosition} ThaiFont`}>
                                    {selected.position}
                                </p>
                            </header>

                            <div className={styles.modalBio}>
                                <h4 className="ThaiFont">ประวัติส่วนตัว</h4>
                                <p className={`${styles.bioPlain} ThaiFont`}>
                                    {selected.background && selected.background !== "-"
                                        ? selected.background
                                        : "ยังไม่มีข้อมูลประวัติส่วนตัว"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function MemberCard({
    member,
    size,
    onSelect,
}: {
    member: CouncilMember;
    size: "lg" | "sm";
    onSelect: (member: CouncilMember) => void;
}) {
    return (
        <article className={`${styles.card} ${size === "lg" ? styles.cardLg : styles.cardSm}`}>
            <div className={styles.photoStage}>
                <img
                    src={member.imageUrl}
                    alt={fullName(member)}
                    className={styles.photo}
                />
            </div>

            <div className={styles.cardBody}>
                <h3 className={`${styles.name} ThaiFont`}>{fullName(member)}</h3>
                <p className={`${styles.position} ThaiFont`}>{member.position}</p>
                <button
                    type="button"
                    className={`${styles.bioBtn} ThaiFont`}
                    onClick={() => onSelect(member)}
                >
                    ดูรายละเอียด
                </button>
            </div>
        </article>
    );
}
