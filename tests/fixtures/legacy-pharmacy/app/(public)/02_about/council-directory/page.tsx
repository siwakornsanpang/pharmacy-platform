import styles from "../subpage.module.css";
import CouncildirectoryContent from "@/components/public/02_about/council-directory/CouncildirectoryContent";
import { getHistory } from "@/lib/api";

export default async function CouncilDirectoryPage() {
    const historyData = await getHistory();

    return (
        <main className={styles.mainContainer}>
            <h2 className={`${styles.contentTitle} ThaiFont`}>
                ทำเนียบสภาเภสัชกรรม
            </h2>

            <div className={styles.contentWrapper}>
                <CouncildirectoryContent initialData={historyData} />
            </div>
        </main>
    );
}
