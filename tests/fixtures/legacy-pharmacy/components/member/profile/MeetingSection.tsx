import { ChevronRight } from "lucide-react";
import styles from "./ProfileComponents.module.css";
import SectionHeader from "@/components/ui/SectionHeader";
import CarouselButtons from "@/components/ui/CarouselButtons";
import DotPagination from "@/components/ui/DotPagination";

interface MeetingItem {
  title: string;
  subtitle: string;
  date: string;
}

const MEETING_DATA: MeetingItem[] = [
  {
    title: "หลักสูตรการฝึกอบรมระยะสั้น ความเป็นผู้ประกอบการภายในในหน่วยงานสำหรับเภสัชกร",
    subtitle: "Short Course Training Program in Intrapreneurship for Pharmacist รุ่นที่ 3 (ปี 2567)",
    date: "02 พ.ค. 2569 - 13 ก.ย. 2569",
  },
  {
    title: "หลักสูตรวุฒิบัตรสาขาการบริหารเภสัชกิจ (Fellow of Pharmacy Administration)",
    subtitle: "สำหรับผู้สมัครเข้าเรียน เพื่อรับวุฒิบัตร",
    date: "15 ต.ค. 2569",
  },
];

export default function MeetingSection() {
    return (
        <div className={styles.sectionSpacer}>
            <SectionHeader title="การประชุมของฉัน">
                <CarouselButtons 
                    onPrev={() => console.log('prev')} 
                    onNext={() => console.log('next')} 
                />
            </SectionHeader>
            
            <div className={styles.cardsContainer}>
                {MEETING_DATA.map((meeting, index) => (
                    <div key={index} className={styles.meetingCard}>
                        <div>
                            <h3 className={styles.meetingTitle}>{meeting.title}</h3>
                            <p className={styles.meetingSubtitle}>{meeting.subtitle}</p>
                        </div>
                        <div className={styles.meetingDate}>
                            <span>วันที่จัดประชุม :</span>
                            <span>{meeting.date}</span>
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
