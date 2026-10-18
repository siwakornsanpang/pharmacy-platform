import Link from "next/link";
import styles from "@/components/public/01_home/HomeSections.module.css";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import MemberOnlySection from "./MemberOnlySection";

interface ServiceItem {
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
}

const OTHER_SERVICES: ServiceItem[] = [
  {
    title: "Pharmacy Academy",
    desc: "แหล่งข้อมูลเพื่อการเรียนรู้และพัฒนาวิชาชีพ\nตั้งแต่การอบรมต่อเนื่องไปจนถึงองค์ความรู้\nที่เป็นประโยชน์ต่อเภสัชกร",
    href: "/learning",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    ),
  },
  {
    title: "สินค้าสภาเภสัชกรรม",
    desc: "ศูนย์รวมสินค้าของสภาฯ ทั้งเอกสารทางวิชาการ\nของที่ระลึก และสื่อสิ่งพิมพ์พร้อมช่องทางชำระเงิน\nและการจัดส่ง",
    href: "/store",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
      </svg>
    ),
  },
];

export default function OtherServiceSection() {
    return (
        <MemberOnlySection>
            <section className={styles.serviceSection}>
                <Container>
                    <SectionHeader title="บริการอื่น ๆ" />
                    <div className={styles.otherServiceGrid}>
                        {OTHER_SERVICES.map((svc, i) => (
                            <Link key={i} href={svc.href} className={styles.otherServiceCard}>
                                <div className={styles.otherServiceIconWrapper}>
                                    <div className={styles.otherServiceCircle}>
                                        {svc.icon}
                                    </div>
                                </div>
                                <div className={styles.otherServiceContent}>
                                    <h3 className={styles.otherServiceTitle}>{svc.title}</h3>
                                    <p className={styles.otherServiceDesc}>{svc.desc}</p>
                                </div>
                                <div className={styles.otherServiceArrow}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M7 17L17 7M17 7H7M17 7V17" />
                                    </svg>
                                </div>
                            </Link>
                        ))}
                    </div>
                </Container>
            </section>
        </MemberOnlySection>
    );
}
