import React from "react";
import styles from "../subpage.module.css";
import PolicyContent from "@/components/public/02_about/policy/PolicyContent";
import { getPolicyCategories, getPolicyProjects, PolicyCategory } from "@/lib/api";

export const metadata = {
    title: "นโยบายสภาเภสัชกรรม | Pharmacy Council",
    description: "ข้อมูลนโยบายและแผนการดำเนินงานของสภาเภสัชกรรม",
};

export default async function PolicyPage() {
    // Fetch data server-side to avoid CORS issues
    let policyData: PolicyCategory[] | undefined = [];
    try {
        const categories = await getPolicyCategories();
        const sortedCategories = categories.sort((a, b) => a.order - b.order);

        policyData = await Promise.all(
            sortedCategories.map(async (cat) => {
                const projects = await getPolicyProjects(cat.id);
                return {
                    ...cat,
                    projects: projects.sort((a, b) => a.order - b.order)
                };
            })
        );
    } catch (error) {
        console.error("Error fetching policy data on server:", error);
    }

    return (
        <div className="ThaiFont">
            <h2 className={styles.contentTitle}>นโยบายสภาเภสัชกรรม</h2>
            <div className="py-6">
                <PolicyContent initialData={policyData} />
            </div>
        </div>
    );
}
