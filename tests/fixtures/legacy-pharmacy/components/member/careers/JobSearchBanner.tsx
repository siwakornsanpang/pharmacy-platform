"use client";

import React from 'react';
import { Search, MapPin } from 'lucide-react';
import styles from './JobSearchBanner.module.css';

interface JobSearchBannerProps {
    onSearch: (query: string, location: string) => void;
}

export default function JobSearchBanner({ onSearch }: JobSearchBannerProps) {
    const [query, setQuery] = React.useState('');
    const [location, setLocation] = React.useState('');

    return (
        <div className={styles.container}>
            <div className={styles.searchBox}>
                <div className={styles.inputGroup}>
                    <Search size={20} className={styles.icon} />
                    <input 
                        type="text" 
                        placeholder="ชื่อตำแหน่งงาน ทักษะ หรือบริษัท" 
                        className={styles.input}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div className={styles.divider}></div>
                <div className={styles.inputGroup}>
                    <MapPin size={20} className={styles.icon} />
                    <input 
                        type="text" 
                        placeholder="จังหวัด หรือสถานที่" 
                        className={styles.input}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />
                </div>
                <button 
                    className={styles.searchBtn}
                    onClick={() => onSearch(query, location)}
                >
                    ค้นหา
                </button>
            </div>
        </div>
    );
}
