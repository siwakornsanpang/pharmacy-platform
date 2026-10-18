import { Agency } from "@/lib/api";
import styles from "./DepartmentStats.module.css";

interface DepartmentStatsProps {
  agencies: Agency[];
}

const CATEGORY_LABELS: Record<string, string> = {
  supervised: "หน่วยงานในกำกับ",
  college: "วิทยาลัย",
  sample_data: "สภาบันไภษัชชยพัฒน์",
  professional_network: "เครือข่ายวิชาชีพ",
  institution: "สถาบันการศึกษา",
  other: "หน่วยงานอื่น ๆ",
};

export default function DepartmentStats({ agencies }: DepartmentStatsProps) {
  // Count agencies per category
  const counts: Record<string, number> = {};
  for (const agency of agencies) {
    counts[agency.category] = (counts[agency.category] || 0) + 1;
  }

  // Order: supervised, college, sample_data, then the rest
  const orderedCategories = [
    "supervised",
    "college",
    "sample_data",
    "professional_network",
    "institution",
    "other",
  ];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.mainTitle}>สภาเภสัชกรรม</h2>
        <div className={styles.statsGrid}>
          {orderedCategories.map((cat) => (
            <div key={cat} className={styles.statItem}>
              <h3 className={styles.statNumber}>{counts[cat] || 0}</h3>
              <p className={styles.statLabel}>{CATEGORY_LABELS[cat]}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
