import Link from "next/link";
import styles from "./ServiceList.module.css";
import SectionHeader from "@/components/ui/SectionHeader";
import { ServiceItem } from "@/features/content/mapping";
import { resolveEServiceHref } from "@/components/public/04_service/e-service/eServiceConfig";

interface ServiceListProps {
  services: ServiceItem[];
  title?: string;
  viewAllHref?: string;
  viewAllText?: string;
}

export default function ServiceList({
  services,
  title = "E-Service",
  viewAllHref,
  viewAllText = "ดูทั้งหมด",
}: ServiceListProps) {
  if (!services || services.length === 0) return null;

  const orderedServices = [...services]
    .filter((item) => !item.isPopular)
    .sort((a, b) => a.order - b.order);

  if (orderedServices.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionCon}>
        <SectionHeader
          className={styles.listHeader}
          title={title}
          viewAllHref={viewAllHref}
          viewAllText={viewAllText}
        />
        <div className={styles.serviceListGrid}>
          {orderedServices.map((item, index) => {
            const localHref = resolveEServiceHref(item.name, item.shortName);
            const href = localHref || item.linkUrl || null;
            const label = (item.shortName || item.name || "").trim();
            const content = (
              <div className={`${styles.serviceLabel} ThaiFont`} title={label}>
                <span className={styles.serviceIndex}>{index + 1}.</span>
                <span className={styles.serviceText}>{label}</span>
              </div>
            );

            if (href) {
              return (
                <Link
                  key={item.id}
                  href={href}
                  className={styles.serviceListItem}
                  target={!localHref && href.startsWith("http") ? "_blank" : "_self"}
                  rel={
                    !localHref && href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div key={item.id} className={styles.serviceListItem}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
