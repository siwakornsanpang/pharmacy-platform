import Link from "next/link";
import { E_SERVICE_MODULES } from "@/components/public/04_service/e-service/eServiceConfig";
import styles from "@/components/public/04_service/e-service/EServiceShell.module.css";

export default function EServiceIndexPage() {
  return (
    <div className={styles.page}>
      <nav className={`${styles.breadcrumb} ThaiFont`} aria-label="breadcrumb">
        <Link href="/home">หน้าแรก</Link>
        <span className={styles.crumbSep}>›</span>
        <Link href="/service">งานบริการ</Link>
        <span className={styles.crumbSep}>›</span>
        <span className={styles.crumbActive}>E-Service</span>
      </nav>

      <header className={styles.titleBand}>
        <div className={styles.titleInner}>
          <h1 className={`${styles.title} ThaiFont`}>E-Service สภาเภสัชกรรม</h1>
        </div>
      </header>

      <div className={styles.body}>
        <section className={styles.card}>
          <div className={styles.hubGrid}>
            {E_SERVICE_MODULES.map((mod) => (
              <Link
                key={mod.slug}
                href={
                  mod.slug === "sap-33"
                    ? `/service/e-service/sap-33/apply`
                    : mod.slug === "sap-22"
                      ? `/service/e-service/sap-22/apply`
                      : `/service/e-service/${mod.slug}`
                }
                className={styles.hubCard}
              >
                <span className={styles.hubCode}>{mod.formCode}</span>
                <h3 className={`${styles.hubTitle} ThaiFont`}>{mod.shortTitle}</h3>
                <p className={`${styles.hubHint} ThaiFont`}>{mod.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
