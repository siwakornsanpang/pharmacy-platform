import { getPublicProjects } from "@/lib/api";
import PeopleProjectContainer from "@/components/public/04_service/people-project/PeopleProjectContainer";
import styles from "./people-project.module.css";

export const dynamic = 'force-dynamic';

export default async function PeopleProjectsPage() {
    const allProjects = await getPublicProjects();

    return (
        <div className={styles.pageWrapper}>
            {/* Banner Section */}
            <header className={styles.banner}>
                <div className={styles.bannerOverlay}>
                    <div className={styles.bannerContent}>
                        <h1 className={`${styles.bannerTitle} ThaiFont`}>โครงการประชาชน</h1>
                        <p className={`${styles.bannerSubtitle} ThaiFont`}>
                            โครงการและกิจกรรมต่าง ๆ เพื่อสาธารณประโยชน์โดยสภาเภสัชกรรม
                        </p>
                    </div>
                </div>
            </header>

            <div className={styles.container}>
                <PeopleProjectContainer allProjects={allProjects} />
            </div>
        </div>
    );
}
