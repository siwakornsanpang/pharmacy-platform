import ServiceBanner from "@/components/public/04_service/ServiceBanner";
import PublicServices from "@/components/public/04_service/PublicServices";
import ServiceList from "@/components/member/service/ServiceList";
import { getServices } from "@/lib/api";
import styles from "@/app/(public)/04_service/service.module.css";

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
    const services = await getServices();

    return (
        <div className={styles.pageWrapper}>
            <ServiceBanner />
            <PublicServices />
            <ServiceList
                services={services}
                title="บริการเภสัชกร"
                viewAllHref="/service/e-service/sap-33/history"
                viewAllText="ประวัติการยื่นคำขอ"
            />
        </div>
    );
}
