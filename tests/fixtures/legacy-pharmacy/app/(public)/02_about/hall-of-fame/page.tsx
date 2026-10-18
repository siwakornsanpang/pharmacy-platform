import HalloffameContent from "@/components/public/02_about/hall-of-fame/HalloffameContent";
import { getHonorRecipients } from "@/lib/api";

export default async function HallOfFamePage() {
    const honorData = await getHonorRecipients();

    return <HalloffameContent initialData={honorData} />;
}
