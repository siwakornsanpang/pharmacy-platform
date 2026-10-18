import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, GraduationCap } from "lucide-react";
import { Agency } from "@/features/content/mapping";
import styles from "./DepartmentColleges.module.css";

interface DepartmentCollegesProps {
  title: string;
  agencies: Agency[];
}

export default function DepartmentColleges({ title, agencies }: DepartmentCollegesProps) {
  if (agencies.length === 0) return null;

  const hero = agencies[0];
  const rest = agencies.slice(1);
  const heroIcon = hero.iconUrl || hero.logoUrl;

  return (
    <section className={styles.section}>
      {/* Decorative Wavy Background */}
      <div className={styles.bgDecoration}>
        <svg viewBox="0 0 1440 800" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave1" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#eef0e4" />
              <stop offset="100%" stopColor="#e0e3cc" />
            </linearGradient>
            <linearGradient id="wave2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e5e8d1" />
              <stop offset="100%" stopColor="#d3d7b4" />
            </linearGradient>
            <linearGradient id="wave3" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d8dbae" />
              <stop offset="100%" stopColor="#c5c99b" />
            </linearGradient>
          </defs>
          <path d="M1440,100 C1000,400 400,600 0,650 L0,800 L1440,800 Z" fill="url(#wave1)" />
          <path d="M1440,350 C900,550 400,700 0,730 L0,800 L1440,800 Z" fill="url(#wave2)" />
          <path d="M1440,600 C1000,700 500,780 0,780 L0,800 L1440,800 Z" fill="url(#wave3)" />
        </svg>
      </div>

      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>{title}</h2>

        <div className={styles.phoneCard}>
          {(hero.thumbnailUrl || heroIcon) && (
            <div className={styles.phonePhoto}>
              {hero.thumbnailUrl ? (
                <Image
                  src={hero.thumbnailUrl}
                  alt={hero.name}
                  fill
                  className={styles.phonePhotoImage}
                />
              ) : (
                <img src={heroIcon!} alt="" className={styles.phonePhotoImage} />
              )}
            </div>
          )}
          <Link
            href={hero.url || "#"}
            target={hero.url ? "_blank" : "_self"}
            rel="noreferrer"
            className={styles.phoneHero}
          >
            {heroIcon ? (
              <img src={heroIcon} alt="" className={styles.phoneHeroIcon} />
            ) : (
              <GraduationCap size={18} className={styles.phoneHeroIcon} />
            )}
            <span className={styles.phoneHeroBody}>
              <span className={styles.phoneHeroTitle}>{hero.name}</span>
              {hero.description && (
                <span className={styles.phoneHeroDesc}>{hero.description}</span>
              )}
            </span>
            <ArrowUpRight size={18} className={styles.phoneHeroArrow} />
          </Link>
          {rest.length > 0 && (
            <>
              <div className={styles.phoneSubhead}>
                <span>วิทยาลัยในสังกัด</span>
                <span>{rest.length} วิทยาลัย</span>
              </div>
              <div className={styles.phoneGrid}>
                {rest.map((agency) => (
                  <Link
                    key={agency.id}
                    href={agency.url || "#"}
                    target={agency.url ? "_blank" : "_self"}
                    rel="noreferrer"
                    className={styles.phoneCell}
                  >
                    <ArrowUpRight size={16} className={styles.phoneCellArrow} />
                    {agency.logoUrl ? (
                      <img src={agency.logoUrl} alt="" className={styles.phoneCellLogo} />
                    ) : (
                      <GraduationCap size={28} className={styles.phoneCellLogo} />
                    )}
                    <span className={styles.phoneCellName}>{agency.name}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.panel}>
        {/* ลำดับที่ 1 — การ์ดใหญ่แบบหน่วยงานในกำกับ */}
        <Link
          href={hero.url || "#"}
          target={hero.url ? "_blank" : "_self"}
          rel="noreferrer"
          className={styles.heroCard}
        >
          <div className={styles.heroContent}>
            {heroIcon ? (
              <img src={heroIcon} alt="" className={styles.heroIcon} />
            ) : (
              <div className={styles.heroIconPlaceholder}>
                <GraduationCap size={28} />
              </div>
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
                fill
                className={styles.heroImage}
              />
              <ArrowUpRight size={24} className={styles.heroArrow} />
            </div>
          )}
          {!hero.thumbnailUrl && (
            <ArrowUpRight size={20} className={styles.heroFallbackArrow} />
          )}
        </Link>

        {rest.length > 0 && (
          <div className={styles.collegeGrid}>
            {rest.map((agency) => (
              <Link
                key={agency.id}
                href={agency.url || "#"}
                target={agency.url ? "_blank" : "_self"}
                rel="noreferrer"
                className={styles.collegeCard}
              >
                <ArrowUpRight size={20} className={styles.cardArrow} />

                {agency.logoUrl ? (
                  <div className={styles.logoWrapper}>
                    <img src={agency.logoUrl} alt="" className={styles.logo} />
                  </div>
                ) : (
                  <div className={styles.logoPlaceholder}>
                    <GraduationCap size={28} />
                  </div>
                )}

                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{agency.name}</h3>
                  {agency.description && (
                    <p className={styles.cardDesc}>{agency.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
