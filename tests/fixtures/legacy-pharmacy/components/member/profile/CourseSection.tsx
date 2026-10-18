import Image from "next/image";
import styles from "./ProfileComponents.module.css";
import SectionHeader from "@/components/ui/SectionHeader";
import CarouselButtons from "@/components/ui/CarouselButtons";
import DotPagination from "@/components/ui/DotPagination";

interface CourseItem {
  id: string;
  title: string;
  credits: string;
  expiryDate: string;
  image: string;
  isExpiringSoon?: boolean;
}

const COURSE_DATA: CourseItem[] = [
  {
    id: "1",
    title: "CPAT210 การวิเคราะห์และพยากรณ์ความต้องการ และการวางแผนกำลังคนเภสัชกร",
    credits: "3 หน่วยกิต",
    expiryDate: "20/04/2569",
    image: "/images/public/home/image1.png",
    isExpiringSoon: true,
  },
  {
    id: "2",
    title: "Pharmacy Transformation: ปรับโมเดลร้านยาและระบบคลังสินค้าสู่ยุคดิจิทัล",
    credits: "1.5 หน่วยกิต",
    expiryDate: "01/08/2569",
    image: "/images/public/home/image4.png",
  },
  {
    id: "3",
    title: "Clinical Practice Update: เจาะลึกแนวทางการจ่ายยาและอุบัติใหม่ประจำปี 2026",
    credits: "3 หน่วยกิต",
    expiryDate: "22/11/2569",
    image: "/images/public/home/image5.png",
  },
];

export default function CourseSection() {
    return (
        <div className={styles.sectionSpacer}>
            <SectionHeader title="คอร์สเรียนของฉัน">
                <CarouselButtons 
                    onPrev={() => console.log('prev')} 
                    onNext={() => console.log('next')} 
                />
            </SectionHeader>

            <div className={styles.coursesGrid}>
                {COURSE_DATA.map((course) => (
                    <div key={course.id} className={styles.courseCard}>
                        <div className={styles.courseThumbWrapper}>
                            <Image src={course.image} alt={course.title} fill className={styles.courseThumb} />
                            {course.isExpiringSoon && <div className={styles.expiryBadge}>ใกล้หมดอายุ</div>}
                        </div>
                        <div className={styles.courseInfo}>
                            <h3 className={styles.courseTitle}>{course.title}</h3>
                            <div className={styles.courseMeta}>
                                <span className={styles.metaItem}>{course.credits}</span>
                                <span className={course.isExpiringSoon ? styles.metaSubRed : styles.metaSub}>
                                    หมดอายุ {course.expiryDate}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <DotPagination 
                total={5} 
                active={0} 
                onClick={(i) => console.log(i)} 
            />
        </div>
    );
}
