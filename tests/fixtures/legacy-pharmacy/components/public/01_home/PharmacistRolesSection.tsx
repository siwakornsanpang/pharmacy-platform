import Image from "next/image";
import styles from "./HomeSections.module.css";
import Container from "@/components/ui/Container";

interface PharmacistRole {
  title: string;
  desc: string;
  image: string;
}

const PHARMACIST_ROLES: PharmacistRole[] = [
  {
    title: "วิจัยพัฒนา และผลิตยา",
    desc: "วิจัยและพัฒนายาใหม่\nควบคุมการผลิตตาม\nมาตรฐานสากล เพื่อ\nให้ได้ยาที่มีคุณภาพ\nแก่ประชาชน",
    image: "/images/public/home/role/role1.png",
  },
  {
    title: "ให้ข้อมูลยาและผลิตภัณฑ์เสริมอาหาร",
    desc: "เป็นผู้เชี่ยวชาญด้านยา\nให้ข้อมูล ที่ถูกต้องแก่\nบุคลากรทาง\nการแพทย์",
    image: "/images/public/home/role/role2.png",
  },
  {
    title: "คัดกรองและให้คำปรึกษา",
    desc: "คัดกรองความเสี่ยง ให้คำปรึกษาด้านยา\nและสุขภาพแก่ประชาชน",
    image: "/images/public/home/role/role3.png",
  },
  {
    title: "บริหารจัดการด้านยา",
    desc: "ตรวจสอบใบสั่งยา ประเมินความเหมาะสม\nป้องกัน แก้ไขปัญหาด้านยา\nและจ่ายยาอย่างปลอดภัย",
    image: "/images/public/home/role/role4.png",
  },
  {
    title: "คุ้มครองความปลอดภัย",
    desc: "เฝ้าระวังคุณภาพ ความปลอดภัย\nของยา และผลิตภัณฑ์สุขภาพเพื่อ\nคุ้มครองผู้บริโภค",
    image: "/images/public/home/role/role5.png",
  },
];

export default function PharmacistRolesSection() {
    return (
        <section className={`${styles.serviceSection} ${styles.roleSection}`}>
            <Container size="2xl" className={styles.roleWrap}>
                <div className={styles.roleMobileHeader}>
                    <h2 className={styles.roleMobileTitle}>บทบาทหน้าที่หลักของเภสัชกร</h2>
                </div>
                <div className={styles.roleGrid}>
                    <div className={styles.roleTitleCard}>
                        <div className={styles.roleTitleIcon}>
                            <svg width="180" height="180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2 className={styles.roleTitleText}>
                            บทบาท<br />หน้าที่หลัก<br />ของเภสัชกร
                        </h2>
                    </div>

                    {PHARMACIST_ROLES.map((role, i) => (
                        <div key={i} className={styles.roleCard}>
                            <div className={styles.roleCardContent}>
                                <h3 className={styles.roleCardTitle}>{role.title}</h3>
                                <p className={styles.roleCardDesc}>{role.desc}</p>
                            </div>
                            <div className={styles.roleCardImage}>
                                <Image
                                    src={role.image}
                                    alt={role.title}
                                    width={400}
                                    height={250}
                                    className={styles.roleImage}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
}
