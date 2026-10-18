"use client";

import { Award, Download } from "lucide-react";
import styles from "./ProfileComponents.module.css";
import SectionHeader from "@/components/ui/SectionHeader";
import CarouselButtons from "@/components/ui/CarouselButtons";
import DotPagination from "@/components/ui/DotPagination";

interface CertificateItem {
  id: string;
  title: string;
  issueDate: string;
  expiryDate?: string;
}

const CERTIFICATE_DATA: CertificateItem[] = [
  {
    id: "CERT-2026-001",
    title: "วุฒิบัตรแสดงความรู้ความชำนาญในการประกอบวิชาชีพเภสัชกรรม (สาขาเภสัชกรรมคลินิก)",
    issueDate: "15 ม.ค. 2568",
    expiryDate: "14 ม.ค. 2573",
  },
  {
    id: "CERT-2026-002",
    title: "ประกาศนียบัตรหลักสูตรการบริบาลทางเภสัชกรรมผู้ป่วยเบาหวาน (การดูแลผู้ป่วยเบาหวานขั้นสูง)",
    issueDate: "20 ส.ค. 2567",
  },
];

export default function CertificateSection() {
    return (
        <div className={styles.sectionSpacer}>
            <SectionHeader title="ใบประกาศนียบัตร / วุฒิบัตร">
                <CarouselButtons 
                    onPrev={() => console.log('prev')} 
                    onNext={() => console.log('next')} 
                />
            </SectionHeader>
            
            <div className={styles.cardsContainer}>
                {CERTIFICATE_DATA.map((cert) => (
                    <div key={cert.id} className={styles.certificateCard}>
                        <div>
                            <div className={styles.certHeader}>
                                <div className={styles.certIconWrap}>
                                    <Award size={24} />
                                </div>
                                <span className={styles.metaSub} style={{fontSize: '0.8rem'}}>รหัส: {cert.id}</span>
                            </div>
                            <h3 className={styles.certTitle}>{cert.title}</h3>
                            <div className={styles.certDate}>
                                <span>วันที่ออก: {cert.issueDate}</span>
                                {cert.expiryDate && (
                                    <>
                                        <span>•</span>
                                        <span className={styles.metaSubRed}>หมดอายุ: {cert.expiryDate}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        <a href="#" className={styles.certAction}>
                            <Download size={16} />
                            ดาวน์โหลดเอกสาร
                        </a>
                    </div>
                ))}
            </div>
            
            <DotPagination 
                total={2} 
                active={0} 
                onClick={(i) => console.log(i)} 
            />
        </div>
    );
}
