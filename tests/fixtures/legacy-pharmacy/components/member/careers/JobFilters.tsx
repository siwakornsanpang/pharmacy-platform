"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
    Building2,
    ChevronDown
} from 'lucide-react';
import styles from './JobFilters.module.css';

interface JobFiltersProps {
    filters: {
        organization: string;
    };
    onChange: (name: string, value: string) => void;
    onClear: () => void;
    organizations: string[];
}

export default function JobFilters({ filters, onChange, onClear, organizations }: JobFiltersProps) {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDropdown = (name: string) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    const renderDropdown = (
        name: string, 
        label: string, 
        icon: React.ReactNode, 
        options: { value: string, label: string }[],
        currentValue: string
    ) => {
        const isOpen = activeDropdown === name;
        const selectedLabel = options.find(opt => opt.value === currentValue)?.label || label;

        return (
            <div className={styles.filterContainer}>
                <button 
                    className={`${styles.filterWrapper} ${currentValue ? styles.hasValue : ''}`}
                    onClick={() => toggleDropdown(name)}
                >
                    <span className={styles.icon}>{icon}</span>
                    <span className={`${styles.label} ThaiFont`}>{selectedLabel}</span>
                    <ChevronDown size={16} className={`${styles.chevron} ${isOpen ? styles.chevronRotate : ''}`} />
                </button>
                
                {isOpen && (
                    <ul className={styles.dropdownMenu}>
                        <li className={styles.menuHeader}>{label}</li>
                        {options.map(opt => (
                            <li key={opt.value}>
                                <button
                                    className={`${styles.dropdownItem} ${currentValue === opt.value ? styles.active : ''} ThaiFont`}
                                    onClick={() => {
                                        onChange(name, opt.value);
                                        setActiveDropdown(null);
                                    }}
                                >
                                    {opt.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    };

    return (
        <div className={styles.filterBar} ref={dropdownRef}>
            {renderDropdown('organization', 'องค์กร', <Building2 size={18} />, organizations.map(org => ({ value: org, label: org })), filters.organization)}
            
            <div className={styles.divider}></div>
            
            <button className={`${styles.clearBtn} ThaiFont`} onClick={onClear}>
                ล้างค่าทั้งหมด
            </button>
        </div>
    );
}
