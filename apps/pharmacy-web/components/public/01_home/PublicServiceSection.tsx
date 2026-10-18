import Link from "next/link";
import PublicOnlySection from "./PublicOnlySection";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import homeStyles from "./HomeSections.module.css";
import serviceStyles from "@/components/public/04_service/PublicServices.module.css";

const PUBLIC_SERVICES = [
  
  {
    id: 1,
    img: "/images/public/service/service2.jpg",
    title: "ร้องเรียนจรรยาบรรณ",
    description: "แจ้งปัญหาการให้บริการไม่เหมาะสม",
    href: "https://law.pharmacycouncil.org/complaint",
  },
  {
    id: 2,
    img: "/images/public/service/service4.jpg",
    title: "ตรวจสอบคำร้อง",
    description: "ตรวจสอบคำร้องเรียน",
    href: "https://law.pharmacycouncil.org/tracking",
  },
  {
    id: 3,
    img: "/images/public/service/service3.jpg",
    title: "แจ้งเบาะแสร้านยาแขวนป้าย",
    description: "รายงานร้านยาที่ไม่อาจปฏิบัติตามมาตรฐาน",
    href: "https://law.pharmacycouncil.org/tip-report",
  },
  {
    
    id: 4,
    img: "/images/public/service/service1.jpg",
    title: "โครงการสำหรับประชาชน",
    description: "กิจกรรมและบริการเพื่อสุขภาพ\nสำหรับทุกคน",
    href: "/service/people-project",
    
    
  },
  {
    id: 5,
    img: "/images/public/service/service5.jpg",
    title: "ร้านยาใกล้ฉัน",
    description: "ค้นหาร้านยาใกล้คุณ",
    href: "#",
  },
  {
    id: 6,
    img: "/images/public/service/service6.jpg",
    title: "เภสัชกรทางไกล",
    description: "ปรึกษาเภสัชกรออนไลน์",
    href: "#",
  },
];

export default function PublicServiceSection() {
  return (
    <PublicOnlySection>
      <section className={`${homeStyles.serviceSection} ${homeStyles.publicServiceSection}`}>
        <Container size="2xl" className={homeStyles.publicServiceWrap}>
          <SectionHeader title="บริการประชาชน" viewAllHref="/service" className={homeStyles.publicHeader} />
          <div className={`${serviceStyles.cardGrid} ${serviceStyles.homeCardGrid}`}>
            {PUBLIC_SERVICES.map((service) => (
              <Link
                key={service.id}
                href={service.href}
                className={serviceStyles.card}
                target={service.href.startsWith("http") ? "_blank" : undefined}
                rel={service.href.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                <img
                  src={service.img}
                  alt={service.title}
                  className={serviceStyles.serviceImage}
                />
                <div className={serviceStyles.cardOverlay}>
                  <h3 className={`${serviceStyles.cardTitle} ThaiFont`}>
                    {service.title}
                  </h3>
                  <p className={`${serviceStyles.cardDescription} ThaiFont`}>
                    {service.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </PublicOnlySection>
  );
}
