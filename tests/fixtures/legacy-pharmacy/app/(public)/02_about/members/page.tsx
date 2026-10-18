import styles from "../subpage.module.css";
import MembersContent from "@/components/public/02_about/members/MembersContent";

export default function MembersPage() {
    return (
        <>
            <h2 className={`${styles.contentTitle} ThaiFont`}>ข้อมูลสมาชิก</h2>
            <div className="pt-6 pb-0">
                <p className="text-slate-600 mb-8 ThaiFont">
                    แสดงข้อมูลจำนวนเภสัชกรที่ขึ้นทะเบียนแยกตามจังหวัด โดยใช้เกณฑ์สีในการบอกความหนาแน่นของผู้ใช้งานในแต่ละพื้นที่
                </p>
                <MembersContent />
            </div>
        </>
    );
}
