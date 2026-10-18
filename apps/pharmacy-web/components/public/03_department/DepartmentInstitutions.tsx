import Link from "next/link";
import { Agency } from "@/features/content/mapping";
import styles from "./DepartmentInstitutions.module.css";

interface DepartmentInstitutionsProps {
  title: string;
  agencies: Agency[];
}

export default function DepartmentInstitutions({ title, agencies }: DepartmentInstitutionsProps) {
  if (agencies.length === 0) return null;

  return (
    <section className={styles.section}>
      <input id="dept-institutions-all" type="checkbox" className={styles.showAllToggle} />
      {/* Decorative Wavy Background */}
      <div className={styles.bgDecoration}>
        <svg viewBox="0 0 1440 800" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="instWave1" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#eef0e4" />
              <stop offset="100%" stopColor="#e0e3cc" />
            </linearGradient>
            <linearGradient id="instWave2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e5e8d1" />
              <stop offset="100%" stopColor="#d3d7b4" />
            </linearGradient>
          </defs>
          <path d="M1440,100 C1000,400 400,600 0,650 L0,800 L1440,800 Z" fill="url(#instWave1)" />
          <path d="M1440,500 C900,600 400,750 0,770 L0,800 L1440,800 Z" fill="url(#instWave2)" />
        </svg>
      </div>

      <div className={styles.container}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{title}</h2>
          <span className={styles.count}>{agencies.length} แห่ง</span>
        </div>

        <div className={styles.listGrid}>
          {agencies.map((agency) => (
            <Link key={agency.id} href={agency.url || "#"} target={agency.url ? "_blank" : "_self"} rel="noreferrer" className={styles.listItem}>
              <span className={styles.bullet} />
              <span className={styles.itemName}>{agency.name}</span>
            </Link>
          ))}
        </div>
        {agencies.length > 8 && (
          <label htmlFor="dept-institutions-all" className={styles.showAllBtn}>
            ดูทั้งหมด ({agencies.length})
          </label>
        )}
      </div>
    </section>
  );
}
