"use client";

import React from 'react';
import { Building2, MapPin, Clock, DollarSign, Calendar, Briefcase, Hospital, Factory, Store } from 'lucide-react';
import styles from './JobCard.module.css';

interface JobCardProps {
    job: {
        id: number;
        title: string;
        company: string;
        location: string;
        salary: string;
        type: string;
        workFormat: string;
        description: string;
        postedAt: string;
        deadline: string;
        tags: string[];
    };
}

export default function JobCard({ job }: JobCardProps) {
    // Helper to get organization icon and color theme based on company name/title
    const getCompanyTheme = (company: string, title: string) => {
        const lowerCompany = company.toLowerCase();
        const lowerTitle = title.toLowerCase();

        if (lowerCompany.includes('hospital') || lowerCompany.includes('โรงพยาบาล') || lowerTitle.includes('โรงพยาบาล')) {
            return {
                icon: <Hospital size={36} />,
                className: styles.hospital
            };
        }
        if (lowerCompany.includes('manufacturing') || lowerCompany.includes('ผลิต') || lowerTitle.includes('ผลิต') || lowerCompany.includes('pharma')) {
            // "Thai Pharma Manufacturing" or "Production Pharmacist"
            if (lowerCompany.includes('manufacturing') || lowerTitle.includes('ผลิต') || lowerTitle.includes('production')) {
                return {
                    icon: <Factory size={36} />,
                    className: styles.factory
                };
            }
        }
        if (lowerCompany.includes('pharmacy') || lowerCompany.includes('ร้านยา') || lowerTitle.includes('ร้านยา')) {
            return {
                icon: <Store size={36} />,
                className: styles.pharmacy
            };
        }
        return {
            icon: <Building2 size={36} />,
            className: styles.default
        };
    };

    const theme = getCompanyTheme(job.company, job.title);

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div className={styles.logoSection}>
                    <div className={`${styles.companyLogo} ${theme.className}`}>
                        {theme.icon}
                    </div>
                </div>
                <div className={styles.titleInfo}>
                    <a href="#" className={styles.titleLink}>
                        <h3 className={`${styles.title} ThaiFont`}>{job.title}</h3>
                    </a>
                    <a href="#" className={styles.companyLink}>
                        <div className={`${styles.companyName} ThaiFont`}>{job.company}</div>
                    </a>
                </div>
            </div>

            <div className={styles.middleSection}>
                <div className={styles.details}>
                    <div className={styles.detailItem}>
                        <MapPin size={16} />
                        <span>{job.location}</span>
                    </div>
                    <div className={styles.detailItem}>
                        <Briefcase size={16} />
                        <span>{job.type}</span>
                    </div>
                    <div className={styles.detailItem}>
                        <Clock size={16} />
                        <span>{job.workFormat}</span>
                    </div>
                </div>
                <div className={styles.salaryBadge}>
                    <DollarSign size={14} />
                    <span>{job.salary}</span>
                </div>
            </div>

            <p className={styles.description}>{job.description}</p>

            <div className={styles.footer}>
                <div className={styles.tags}>
                    {job.tags.map((tag, index) => (
                        <span key={index} className={styles.tag}>{tag}</span>
                    ))}
                </div>
                <div className={styles.dates}>
                    <div className={styles.dateItem}>
                        <Calendar size={14} />
                        <span>หมดเขต: {job.deadline}</span>
                    </div>
                </div>
            </div>

            <div className={styles.actions}>
                <a href={`#job-${job.id}`} className={styles.viewBtn}>ดูรายละเอียด</a>
            </div>
        </div>
    );
}

