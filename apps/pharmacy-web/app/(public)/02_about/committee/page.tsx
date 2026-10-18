import styles from "../subpage.module.css";
import CommitteeContent, { CouncilMember } from "@/components/public/02_about/committee/CommitteeContent";

import { getCouncil } from "@/features/content/server-api";

export default async function CommitteePage() {
    const members = (await getCouncil()).filter(item => item?.id && item?.imageUrl).sort((a,b) => (a.order || 0) - (b.order || 0));

    return (
        <>
            <h2 className={`${styles.contentTitle} ThaiFont`}>
                กรรมการเภสัชกรรม
            </h2>

            <CommitteeContent initialMembers={members} />
        </>
    );
}