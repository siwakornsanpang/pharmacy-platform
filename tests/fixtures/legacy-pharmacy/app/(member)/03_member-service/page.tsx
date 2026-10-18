import EServiceBanner from "@/components/member/service/EServiceBanner";
import ServiceList from "@/components/member/service/ServiceList";
import { getServices } from "@/lib/api";
import styles from "./member-service.module.css";

export const dynamic = 'force-dynamic';

export default async function MemberServicesPage() {
    const services = await getServices();

    return (
        <div className={styles.pageWrapper}>
            <EServiceBanner />
            <ServiceList
                services={services}
                viewAllHref="/service/e-service/sap-33/history"
                viewAllText="ประวัติการยื่นคำขอ"
            />
        </div>
    );
}
