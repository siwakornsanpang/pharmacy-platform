import Link from "next/link";
import styles from "./PopularServices.module.css";
import SectionHeader from "@/components/ui/SectionHeader";

import { ServiceItem } from "@/lib/api";
import { resolveEServiceHref } from "@/components/public/04_service/e-service/eServiceConfig";

interface PopularServicesProps {
  services: ServiceItem[];
  /** Defaults to homepage "ดูทั้งหมด" → /service */
  viewAllHref?: string;
  viewAllText?: string;
}

export default function PopularServices({
  services,
  viewAllHref = "/service",
  viewAllText = "ดูทั้งหมด",
}: PopularServicesProps) {
  if (!services || services.length === 0) return null;

  const count = Math.min(Math.max(services.length, 1), 4);
  const gridClass = `${styles.popularGrid} ${styles[`count${count}`]}`;

  return (
    <section className={styles.section}>
      <div className={styles.sectionCon}>
        <SectionHeader
          title="E-Service"
          viewAllHref={viewAllHref}
          viewAllText={viewAllText}
        />
        <div className={gridClass}>
          {services.map((service) => {
            const localHref = resolveEServiceHref(service.name, service.shortName);
            const href = localHref || service.linkUrl || "/service";
            return (
            <Link
              key={service.id}
              href={href}
              className={styles.popularCard}
              target={!localHref && href.startsWith('http') ? "_blank" : "_self"}
              rel={!localHref && href.startsWith('http') ? "noopener noreferrer" : undefined}
            >
              <div className={styles.iconCircle}>
                {service.iconUrl ? (
                  <img src={service.iconUrl} alt={service.name} style={{ width: 40 }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#eee', borderRadius: '50%' }} />
                )}
              </div>
              <h3 className={`${styles.cardTitle} ThaiFont`}>
                {service.shortName || service.name}
              </h3>
              <p className={`${styles.cardDesc} ThaiFont`}>{service.description}</p>
            </Link>
          );
          })}
        </div>
      </div>
    </section>
  );
}
