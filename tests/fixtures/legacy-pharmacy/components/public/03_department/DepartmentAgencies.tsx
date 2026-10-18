import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Building2, ChevronRight } from "lucide-react";
import { Agency } from "@/lib/api";
import styles from "./DepartmentAgencies.module.css";

interface DepartmentAgenciesProps {
  title: string;
  agencies: Agency[];
  phoneDetail?: boolean;
}

export default function DepartmentAgencies({ title, agencies, phoneDetail = false }: DepartmentAgenciesProps) {
  if (agencies.length === 0) return null;

  // First agency is the hero card
  const hero = agencies[0];
  const rest = agencies.slice(1);
  const gridCount = Math.min(Math.max(rest.length, 1), 3);
  const gridClass = `${styles.agencyGrid} ${styles[`count${gridCount}`]}`;

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>{title}</h2>

        <div className={phoneDetail ? styles.detailCard : styles.phoneOnly}>
          {phoneDetail && hero.thumbnailUrl && (
            <Link
              href={hero.url || "#"}
              target={hero.url ? "_blank" : "_self"}
              rel="noreferrer"
              className={styles.detailPhoto}
            >
              <Image
                src={hero.thumbnailUrl}
                alt={hero.name}
                fill
                className={styles.galleryImage}
              />
            </Link>
          )}
          {!phoneDetail && agencies.some((agency) => agency.thumbnailUrl) && (
            <div className={styles.gallery}>
              {agencies
                .filter((agency) => agency.thumbnailUrl)
                .map((agency) => (
                  <Link
                    key={agency.id}
                    href={agency.url || "#"}
                    target={agency.url ? "_blank" : "_self"}
                    rel="noreferrer"
                    className={styles.galleryCard}
                  >
                    <Image
                      src={agency.thumbnailUrl!}
                      alt={agency.name}
                      fill
                      className={styles.galleryImage}
                    />
                  </Link>
                ))}
            </div>
          )}
          <div className={styles.listCard}>
            {agencies.map((agency, index) => {
              const open = phoneDetail && index === 0 && Boolean(agency.description);
              return (
                <Link
                  key={agency.id}
                  href={agency.url || "#"}
                  target={agency.url ? "_blank" : "_self"}
                  rel="noreferrer"
                  className={open ? styles.listRowOpen : styles.listRow}
                >
                  {agency.iconUrl ? (
                    <img src={agency.iconUrl} alt="" className={styles.listIcon} />
                  ) : (
                    <span className={styles.listIconFallback}>
                      <Building2 size={16} />
                    </span>
                  )}
                  <span className={styles.listBody}>
                    <span className={styles.listName}>{agency.name}</span>
                    {open && (
                      <span className={styles.listDesc}>{agency.description}</span>
                    )}
                  </span>
                  {open ? (
                    <ArrowUpRight size={18} className={styles.listArrow} />
                  ) : (
                    <ChevronRight size={18} className={styles.listChevron} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className={styles.panel}>
        {/* Hero Card (First Agency) */}
        <Link href={hero.url || "#"} target={hero.url ? "_blank" : "_self"} rel="noreferrer" className={styles.heroCard}>
          <div className={styles.heroContent}>
            {hero.iconUrl && (
              <img src={hero.iconUrl} alt="" className={styles.heroIcon} />
            )}
            <h3 className={styles.heroTitle}>{hero.name}</h3>
            {hero.description && (
              <p className={styles.heroDesc}>{hero.description}</p>
            )}
          </div>
          {hero.thumbnailUrl && (
            <div className={styles.heroImageWrapper}>
              <Image
                src={hero.thumbnailUrl}
                alt={hero.name}
                fill /* 🔴 ใช้ fill เพื่อให้รูปขยายเต็มพื้นที่ด้านขวา */
                className={styles.heroImage}
              />
              {/* 🔴 เพิ่มลูกศรให้การ์ดใหญ่ด้วย */}
              <ArrowUpRight size={24} className={styles.heroArrow} />
            </div>
          )}
        </Link>

        {/* Grid of remaining agencies */}
        {rest.length > 0 && (
          <div className={gridClass}>
            {rest.map((agency) => (
              <Link
                key={agency.id}
                href={agency.url || "#"}
                target={agency.url ? "_blank" : "_self"}
                rel="noreferrer"
                className={styles.agencyCard}
              >
                <ArrowUpRight size={20} className={styles.cardArrow} />

                {agency.iconUrl ? (
                  <img src={agency.iconUrl} alt="" className={styles.cardIcon} />
                ) : (
                  <div className={styles.cardIconPlaceholder}>
                    <Building2 size={24} />
                  </div>
                )}

                <h3 className={styles.cardTitle}>{agency.name}</h3>
                {agency.description && (
                  <p className={styles.cardDesc}>{agency.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
