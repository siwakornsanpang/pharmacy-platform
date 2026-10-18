'use client';

import { useState } from 'react';
import { Search, ListFilter, ChevronDown } from 'lucide-react';
import styles from './DocumentSearch.module.css';

const searchCategories = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'forms', label: 'แบบฟอร์ม' },
  { value: 'manuals', label: 'คู่มือ/แนวทาง' },
];

interface DocumentSearchProps {
  query: string;
  setQuery: (q: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
}

export default function DocumentSearch({ query, setQuery, filterType, setFilterType }: DocumentSearchProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedCategory = searchCategories.find(c => c.value === filterType) || searchCategories[0];

  return (
    <div className={styles.wrapper}>
      <h2 className={`${styles.title} ThaiFont`}>ค้นหาเอกสาร</h2>

      <div className={styles.searchRow}>
        {/* Dropdown */}
        <div className={styles.dropdown}>
          <button
            type="button"
            className={`${styles.dropdownButton} ThaiFont`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <ListFilter size={18} className={styles.dropdownIcon} strokeWidth={1.5} />
            <span>{selectedCategory.label}</span>
            <ChevronDown size={14} className={styles.chevron} strokeWidth={1.5} />
          </button>

          {dropdownOpen && (
            <ul className={styles.dropdownMenu}>
              {searchCategories.map(cat => (
                <li key={cat.value}>
                  <button
                    type="button"
                    className={`${styles.dropdownItem} ThaiFont ${cat.value === filterType ? styles.dropdownItemActive : ''}`}
                    onClick={() => {
                      setFilterType(cat.value);
                      setDropdownOpen(false);
                    }}
                  >
                    {cat.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Search input */}
        <div className={styles.inputWrap}>
          <Search size={18} className={styles.inputIcon} strokeWidth={1.5} />
          <input
            type="text"
            className={`${styles.input} ThaiFont`}
            placeholder="ค้นหาจากชื่อไฟล์ หรือประเภท..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <button type="button" className={`${styles.searchButton} ThaiFont`}>
          ค้นหา
        </button>
      </div>
    </div>
  );
}
