import { getAgencies } from "@/features/content/server-api";
import DepartmentStats from "@/components/public/03_department/DepartmentStats";
import DepartmentAgencies from "@/components/public/03_department/DepartmentAgencies";
import DepartmentColleges from "@/components/public/03_department/DepartmentColleges";
import DepartmentNetwork from "@/components/public/03_department/DepartmentNetwork";
import DepartmentInstitutions from "@/components/public/03_department/DepartmentInstitutions";
import DepartmentOther from "@/components/public/03_department/DepartmentOther";
import styles from "./department.module.css";

export const dynamic = 'force-dynamic';

export default async function DepartmentPage() {
    const agencies = await getAgencies();

    // Filter by category
    const supervisedAgencies = agencies
        .filter(a => a.category === "supervised")
        .sort((a, b) => a.order - b.order);

    const collegeAgencies = agencies
        .filter(a => a.category === "college")
        .sort((a, b) => a.order - b.order);

    const sampleDataAgencies = agencies
        .filter(a => a.category === "sample_data")
        .sort((a, b) => a.order - b.order);

    const networkAgencies = agencies
        .filter(a => a.category === "professional_network")
        .sort((a, b) => a.order - b.order);

    const institutionAgencies = agencies
        .filter(a => a.category === "institution")
        .sort((a, b) => a.order - b.order);

    const otherAgencies = agencies
        .filter(a => a.category === "other")
        .sort((a, b) => a.order - b.order);

    return (
        <div className={styles.pageWrapper}>
            {/* Banner Section (kept as-is) */}
            <header className={styles.banner}>
                <div className={styles.bannerOverlay}>
                    <div className={styles.bannerContent}>
                        <h1 className={styles.bannerTitle}>หน่วยงาน</h1>
                        <p className={styles.bannerSubtitle}>
                            หน่วยงานในกำกับของสภาเภสัชกรรม
                        </p>
                    </div>
                </div>
            </header>

            {/* Stats Section */}
            {/* <DepartmentStats agencies={agencies} /> */}

            {/* หน่วยงานในกำกับ */}
            <DepartmentAgencies
                title="หน่วยงานในกำกับของสภาเภสัชกรรม"
                agencies={supervisedAgencies}
                phoneDetail
            />

            {/* วิทยาลัย */}
            <DepartmentColleges
                title="ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย"
                agencies={collegeAgencies}
            />

            {/* สถาบันเภสัช — layout แบบหน่วยงานในกำกับ */}
            <DepartmentAgencies
                title="สภาบันไภษัชชยพัฒน์"
                agencies={sampleDataAgencies}
                phoneDetail
            />

            {/* เครือข่ายวิชาชีพ */}
            <DepartmentNetwork
                title="เครือข่ายวิชาชีพ"
                agencies={networkAgencies}
            />

            {/* สถาบันการศึกษา */}
            <DepartmentInstitutions
                title="สถาบันการศึกษา"
                agencies={institutionAgencies}
            />

            {/* หน่วยงานอื่น ๆ ที่เกี่ยวข้อง */}
            <DepartmentOther
                title={"\u0e2b\u0e19\u0e48\u0e27\u0e22\u0e07\u0e32\u0e19\u0e2d\u0e37\u0e48\u0e19 \u0e46\n\u0e17\u0e35\u0e48\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e02\u0e49\u0e2d\u0e07"}
                agencies={otherAgencies}
            />
        </div>
    );
}
