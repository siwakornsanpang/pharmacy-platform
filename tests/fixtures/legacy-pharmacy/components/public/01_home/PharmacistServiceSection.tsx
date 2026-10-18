import Link from "next/link";
import styles from "./HomeSections.module.css";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";

import { ServiceItem } from "@/lib/api";

interface PharmacistServiceSectionProps {
  services: ServiceItem[];
}

export default function PharmacistServiceSection({ services }: PharmacistServiceSectionProps) {
    if (!services || services.length === 0) return null;

    return (
        <section className={styles.serviceSection}>
            <Container>
                <SectionHeader title="E-Service" viewAllHref="/service" />
                <div className={styles.pharmaGrid}>
                    {services.map((svc) => (
                        <Link 
                            key={svc.id} 
                            href={svc.linkUrl || "/service"} 
                            className={styles.pharmaCard}
                            target={svc.linkUrl?.startsWith('http') ? "_blank" : "_self"}
                            rel={svc.linkUrl?.startsWith('http') ? "noopener noreferrer" : undefined}
                        >
                            <div className={styles.pharmaCardIcon}>
                                {svc.iconUrl ? (
                                    <img src={svc.iconUrl} alt={svc.name || ""} className={styles.pharmaIconImg} />
                                ) : (
                                    <div className={styles.pharmaIconPlaceholder} />
                                )}
                            </div>
                            <h3 className={styles.pharmaCardTitle}>
                                {svc.shortName || svc.name}
                            </h3>
                            {svc.description && (
                                <p className={styles.pharmaCardDesc}>{svc.description}</p>
                            )}
                        </Link>
                    ))}
                </div>
            </Container>
        </section>
    );
}
