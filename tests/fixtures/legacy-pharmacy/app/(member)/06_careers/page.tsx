"use client";

import React from 'react';
import CareersBanner from '@/components/member/careers/CareersBanner';
import JobSearchBanner from '@/components/member/careers/JobSearchBanner';
import JobListing from '@/components/member/careers/JobListing';
import styles from "./careers.module.css";

const MOCK_JOBS = [
    {
        id: 1,
        title: "เภสัชกรประจำร้านยา (Full-time)",
        company: "Health Plus Pharmacy",
        location: "กรุงเทพฯ (เขตปทุมวัน)",
        salary: "45,000 - 60,000",
        type: "งานประจำ",
        workFormat: "On-site",
        description: "รับผิดชอบงานด้านการจ่ายยา ให้คำปรึกษาด้านสุขภาพแก่ผู้รับบริการ บริหารจัดการคลังยาภายในร้าน และดูแลความเรียบร้อยทั่วไปของร้านยา",
        postedAt: "2 วันที่แล้ว",
        deadline: "30 มิ.ย. 2567",
        tags: ["ยินดีรับเด็กจบใหม่", "มีค่าใบประกอบ", "โบนัสประจำปี"]
    },
    {
        id: 2,
        title: "เภสัชกรฝ่ายผลิต (Production Pharmacist)",
        company: "Thai Pharma Manufacturing Co., Ltd.",
        location: "สมุทรปราการ",
        salary: "35,000 - 50,000",
        type: "งานประจำ",
        workFormat: "On-site",
        description: "ควบคุมดูแลกระบวนการผลิตยาให้เป็นไปตามมาตรฐาน GMP/PICs ตรวจสอบเอกสารการผลิต และประสานงานกับแผนกที่เกี่ยวข้อง",
        postedAt: "5 วันที่แล้ว",
        deadline: "15 มิ.ย. 2567",
        tags: ["ประสบการณ์ 1-3 ปี", "GMP/PICs", "ประกันสังคม"]
    },
    {
        id: 3,
        title: "เภสัชกรโรงพยาบาล (Hospital Pharmacist)",
        company: "โรงพยาบาลเมดิกัลเซ็นเตอร์",
        location: "เชียงใหม่",
        salary: "40,000 - 55,000",
        type: "งานประจำ",
        workFormat: "On-site",
        description: "ปฏิบัติงานในแผนกเภสัชกรรมโรงพยาบาล จ่ายยาให้ผู้ป่วยนอกและผู้ป่วยใน ตรวจสอบความถูกต้องของคำสั่งใช้ยาจากแพทย์",
        postedAt: "1 สัปดาห์ที่แล้ว",
        deadline: "20 มิ.ย. 2567",
        tags: ["เภสัชกรรมคลินิก", "ค่าเวรพิเศษ", "ที่พักสวัสดิการ"]
    },
    {
        id: 4,
        title: "เภสัชกร Part-time (เสาร์-อาทิตย์)",
        company: "Care & Cure Pharmacy",
        location: "นนทบุรี",
        salary: "วันละ 1,500 - 2,000",
        type: "งานพาร์ทไทม์",
        workFormat: "On-site",
        description: "ปฏิบัติงานจ่ายยาและให้คำปรึกษาในวันหยุดเสาร์-อาทิตย์ เวลา 10.00 - 20.00 น.",
        postedAt: "3 วันที่แล้ว",
        deadline: "จนกว่าจะได้คน",
        tags: ["พาร์ทไทม์", "จ่ายรายวัน", "ไม่จำกัดประสบการณ์"]
    }
];

export default function CareersPage() {
    const [searchQuery, setSearchQuery] = React.useState({ query: '', location: '' });
    const [activeFilters, setActiveFilters] = React.useState({
        organization: ''
    });

    const uniqueOrganizations = Array.from(new Set(MOCK_JOBS.map(job => job.company)));

    const handleSearch = (query: string, location: string) => {
        setSearchQuery({ query, location });
    };

    const handleFilterChange = (name: string, value: string) => {
        setActiveFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setActiveFilters({ organization: '' });
    };

    const filteredJobs = MOCK_JOBS.filter(job => {
        const matchesQuery = job.title.toLowerCase().includes(searchQuery.query.toLowerCase()) || 
                            job.company.toLowerCase().includes(searchQuery.query.toLowerCase());
        const matchesLocation = job.location.toLowerCase().includes(searchQuery.location.toLowerCase());
        
        const matchesOrganization = activeFilters.organization ? job.company === activeFilters.organization : true;

        return matchesQuery && matchesLocation && matchesOrganization;
    });

    return (
        <div className={styles.mainContainer}>
            <CareersBanner />
            
            <div className={styles.container}>
                <div className={styles.searchSection}>
                    <JobSearchBanner onSearch={handleSearch} />
                </div>

                <JobListing 
                    jobs={filteredJobs} 
                    organizationFilter={activeFilters.organization}
                    onFilterChange={(value) => handleFilterChange('organization', value)}
                    organizations={uniqueOrganizations}
                />
            </div>
        </div>
    );
}
