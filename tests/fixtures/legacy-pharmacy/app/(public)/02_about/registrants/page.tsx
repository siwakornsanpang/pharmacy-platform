import styles from "../subpage.module.css";
import RegistrantsContent from "@/components/public/02_about/registrants/RegistrantsContent";

export default function RegistrantsPage() {
  return (
    <>
      <h2 className={`${styles.contentTitle} ThaiFont`}>จำนวนผู้ขึ้นทะเบียน</h2>
      <RegistrantsContent />
    </>
  );
}
