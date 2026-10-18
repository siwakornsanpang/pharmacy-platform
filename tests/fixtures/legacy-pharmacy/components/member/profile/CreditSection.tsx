import styles from "./ProfileComponents.module.css";


// 🔴 เอาบรรทัด Import SVG ออกไปได้เลย

interface CreditItem {
  value: string;
  label: string;
  percent: number;
}

const CREDIT_DATA: CreditItem[] = [
  {
    value: "5/10",
    label: "หน่วยกิตประจำปี 2569",
    percent: 50,
  },
  {
    value: "25/100",
    label: "รอบที่ 2 ปี 2568 - 2573",
    percent: 25,
  },
];

export default function CreditSection() {
    return (
        <div className={styles.sectionSpacer}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>หน่วยกิตของฉัน</h2>

            </div>
            <div className={styles.creditsGrid}>
                {CREDIT_DATA.map((item, index) => (
                    <div key={index} className={styles.creditCard}>
                        
                        {/* โค้ดรูปภาพหายไปแล้ว! เหลือแค่เนื้อหาเน้นๆ */}
                        <div className={styles.creditValue}>{item.value}</div>
                        <div className={styles.creditLabel}>{item.label}</div>
                        <div className={styles.progressContainer}>
                            <div className={styles.progressOuter}>
                                <div 
                                    className={styles.progressInner} 
                                    style={{ '--progress-width': `${item.percent}%` } as React.CSSProperties}
                                ></div>
                            </div>
                        </div>
                        
                    </div>
                ))}
            </div>
        </div>
    );
}