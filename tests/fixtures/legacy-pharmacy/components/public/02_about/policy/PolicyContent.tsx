"use client";

import React, { useEffect, useState } from "react";
import styles from "./PolicyContent.module.css";
import Link from "next/link";
import { getPolicyCategories, getPolicyProjects, PolicyCategory, PolicyProject } from "@/lib/api";

const STATUS_LABELS = {
    planned: "เริ่มวางแผน",
    ongoing: "กำลังดำเนินการ",
    completed: "เสร็จโครงการ",
    delayed: "ชะลอโครงการ",
    terminated: "ยุติโครงการ",
};

export default function PolicyContent({ initialData = [] }: { initialData?: PolicyCategory[] }) {
    const [policyData, setPolicyData] = useState<PolicyCategory[]>(initialData);
    const [isLoading, setIsLoading] = useState(initialData.length === 0);

    useEffect(() => {
        // Only fetch if initialData was empty (fallback)
        if (initialData.length > 0) {
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const categories = await getPolicyCategories();
                const sortedCategories = categories.sort((a, b) => a.order - b.order);

                const dataWithProjects = await Promise.all(
                    sortedCategories.map(async (cat) => {
                        const projects = await getPolicyProjects(cat.id);
                        return {
                            ...cat,
                            projects: projects.sort((a, b) => a.order - b.order)
                        };
                    })
                );

                setPolicyData(dataWithProjects);
            } catch (error) {
                console.error("Error fetching policy data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [initialData]);

    const renderStatus = (status: string, targetStatus: string) => {
        const isActive = status === targetStatus;
        let activeClass = styles.progressStepActiveGreen;

        if (targetStatus === "planned") activeClass = styles.progressStepActiveGray;
        if (targetStatus === "ongoing") activeClass = styles.progressStepActiveBlue;
        if (targetStatus === "delayed") activeClass = styles.progressStepActiveYellow;
        if (targetStatus === "terminated") activeClass = styles.progressStepActiveRed;

        const noBorder = targetStatus === "planned" || targetStatus === "ongoing" || targetStatus === "delayed";

        return (
            <td className={`${styles.statusCell} ${noBorder ? styles.noBorderRight : ""}`}>
                <div className={styles.progressBarContainer}>
                    <div className={`${styles.progressStep} ${isActive ? activeClass : ""}`} />
                </div>
            </td>
        );
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20 text-gray-400">
                <div className="animate-pulse">กำลังโหลดข้อมูลนโยบาย...</div>
            </div>
        );
    }

    if (policyData.length === 0) {
        return (
            <div className="text-center py-20 text-gray-400">
                ไม่พบข้อมูลนโยบายในขณะนี้
            </div>
        );
    }

    return (
        <div className="ThaiFont">
            {/* Desktop Table View */}
            <div className={styles.desktopWrapper}>
                <div className={styles.policyContainer}>
                    <table className={styles.policyTable}>
                        <colgroup>
                            <col style={{ width: "20%" }} />
                            <col style={{ width: "25%" }} />
                            <col style={{ width: "10%" }} />
                            <col style={{ width: "9%" }} />
                            <col style={{ width: "9%" }} />
                            <col style={{ width: "9%" }} />
                            <col style={{ width: "9%" }} />
                            <col style={{ width: "9%" }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className={styles.policyColumn}>นโยบาย</th>
                                <th className={styles.projectColumn}>โครงการ</th>
                                <th className={styles.summaryColumn}>สรุป</th>
                                <th className={styles.noBorderRight}>เริ่มวางแผน</th>
                                <th className={styles.noBorderRight}>กำลัง ดำเนินการ</th>
                                <th>เสร็จโครงการ</th>
                                <th className={styles.noBorderRight}>ชะลอโครงการ</th>
                                <th>ยุติโครงการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {policyData.map((category) => (
                                <React.Fragment key={category.id}>
                                    {(category.projects || []).map((project, index) => (
                                        <tr key={project.id} className={index === 0 ? styles.groupStartRow : ""}>
                                            {index === 0 && (
                                                <td
                                                    rowSpan={(category.projects || []).length}
                                                    className={`${styles.categoryCell} ${styles.policyColumn}`}
                                                >
                                                    <div className={styles.categoryTitleText}>{category.title}</div>
                                                </td>
                                            )}
                                            <td className={styles.projectCell}>
                                                <div className={styles.projectNameWrapper}>
                                                    <span className={styles.bullet} />
                                                    {project.name}
                                                </div>
                                            </td>
                                            <td className={styles.summaryCell}>
                                                {project.summaryPdfUrl ? (
                                                    <Link
                                                        href={project.summaryPdfUrl}
                                                        className={styles.downloadButton}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        อ่านสรุป
                                                    </Link>
                                                ) : (
                                                    <span className={styles.noSummaryText}>ไม่มีสรุป</span>
                                                )}
                                            </td>
                                            {renderStatus(project.status, "planned")}
                                            {renderStatus(project.status, "ongoing")}
                                            {renderStatus(project.status, "completed")}
                                            {renderStatus(project.status, "delayed")}
                                            {renderStatus(project.status, "terminated")}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className={styles.mobileWrapper}>
                {policyData.map((category) => (
                    <div key={category.id} className={styles.categoryCard}>
                        <div className={styles.categoryCardTitle}>{category.title}</div>
                        <div className={styles.projectList}>
                            {(category.projects || []).map((project) => (
                                <div key={project.id} className={styles.projectCard}>
                                    <div className={styles.projectCardHeader}>
                                        <div className={styles.projectCardName}>{project.name}</div>
                                        {project.summaryPdfUrl && (
                                            <Link
                                                href={project.summaryPdfUrl}
                                                className={styles.mobileSummaryBtn}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                อ่านสรุป
                                            </Link>
                                        )}
                                    </div>
                                    <div className={styles.mobileStatusWrapper}>
                                        <div className={styles.mobileStatusLabel}>สถานะ: {STATUS_LABELS[project.status as keyof typeof STATUS_LABELS]}</div>
                                        <div className={styles.mobileProgressBar}>
                                            <div
                                                className={`${styles.mobileProgressFill} ${project.status === 'planned' ? styles.bgGray :
                                                    project.status === 'ongoing' ? styles.bgBlue :
                                                        project.status === 'delayed' ? styles.bgYellow :
                                                            project.status === 'terminated' ? styles.bgRed :
                                                                styles.bgGreen
                                                    }`}
                                                style={{
                                                    width:
                                                        project.status === 'planned' ? '20%' :
                                                            project.status === 'ongoing' ? '50%' :
                                                                '100%'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}