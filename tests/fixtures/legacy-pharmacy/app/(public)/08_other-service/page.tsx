import OtherServiceContent from '@/components/public/08_other-service/OtherServiceContent';
import { getAllOtherServiceItems, getOtherServiceCategories } from '@/lib/api';
import styles from './other-service.module.css';

export const dynamic = 'force-dynamic';

export default async function OtherServicesPage() {
    const [categories, items] = await Promise.all([
        getOtherServiceCategories(),
        getAllOtherServiceItems(),
    ]);

    return (
        <div className={styles.pageWrapper}>
            <header className={styles.banner}>
                <div className={styles.bannerOverlay}>
                    <div className={styles.bannerContent}>
                        <h1 className={styles.bannerTitle}>ดาวน์โหลด</h1>
                        <p className={styles.bannerSubtitle}>
                            พระราชบัญญัติ กฎกระทรวง ข้อบังคับ ระเบียบ ประกาศ คำสั่ง
                        </p>
                    </div>
                </div>
            </header>

            <OtherServiceContent categories={categories} items={items} />
        </div>
    );
}
