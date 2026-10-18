import styles from "../subpage.module.css";
import CommitteeContent, { CouncilMember } from "@/components/public/02_about/committee/CommitteeContent";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pharmacy-api-6w5d.onrender.com";

export default async function CommitteePage() {
    let members: CouncilMember[] = [];
    try {
        const cleanApiUrl = API_URL.replace(/\/$/, "");
        const res = await fetch(`${cleanApiUrl}/council`, {
            next: { revalidate: 60 }
        });

        if (res.ok) {
            const json = await res.json();
            const data = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);
            members = data
                .filter((item: CouncilMember) => item?.id && item?.imageUrl)
                .sort((a: CouncilMember, b: CouncilMember) => (a.order || 0) - (b.order || 0));
        }
    } catch (error) {
        console.error("Failed to fetch council on server:", error);
    }

    return (
        <>
            <h2 className={`${styles.contentTitle} ThaiFont`}>
                กรรมการเภสัชกรรม
            </h2>

            <CommitteeContent initialMembers={members} />
        </>
    );
}