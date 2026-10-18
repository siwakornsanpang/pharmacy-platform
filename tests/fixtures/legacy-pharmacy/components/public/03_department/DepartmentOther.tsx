import Link from "next/link";
import { Agency } from "@/lib/api";
import styles from "./DepartmentOther.module.css";

interface DepartmentOtherProps {
  title: string;
  agencies: Agency[];
}

export default function DepartmentOther({ title, agencies }: DepartmentOtherProps) {
  if (agencies.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.titleWrapper}>
            <h2 className={styles.title}>{title}</h2>
          </div>

          <ul className={styles.list}>
            {agencies.map((agency) => (
              <li key={agency.id}>
                <Link href={agency.url || "#"} target={agency.url ? "_blank" : "_self"} rel="noreferrer" className={styles.listItem}>
                  <span className={styles.bullet} />
                  <span className={styles.itemName}>{agency.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
