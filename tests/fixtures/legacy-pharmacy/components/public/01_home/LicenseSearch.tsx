"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, ListFilter } from "lucide-react";
import styles from "./LicenseSearch.module.css";
import {
  SearchType,
  searchOptions,
  buildLicenseSearchPath,
  normalizeLicenseDigits,
} from "./licenseSearchShared";

export default function LicenseSearch() {
  const router = useRouter();
  const [searchType, setSearchType] = useState<SearchType>("license");
  const [query, setQuery] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedOption = searchOptions.find((o) => o.value === searchType)!;

  const handleSearch = () => {
    const path = buildLicenseSearchPath({
      type: searchType,
      query,
      firstName,
      lastName,
    });
    if (!path) return;
    router.push(path);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.searchBoxCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>ค้นหารายชื่อ</h2>
          <span className={styles.subtitle}>ผู้ประกอบวิชาชีพเภสัชกรรม</span>
        </div>

        <div className={styles.searchRow}>
          <div className={styles.dropdown}>
            <button
              type="button"
              className={styles.dropdownButton}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <ListFilter size={18} className={styles.dropdownIcon} />
              <span>{selectedOption.label}</span>
              <ChevronDown size={16} className={styles.chevron} />
            </button>
            {dropdownOpen && (
              <ul className={styles.dropdownMenu}>
                {searchOptions.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${
                        opt.value === searchType ? styles.dropdownItemActive : ""
                      }`}
                      onClick={() => {
                        setSearchType(opt.value);
                        setDropdownOpen(false);
                        setQuery("");
                        setFirstName("");
                        setLastName("");
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {searchType === "name" ? (
            <>
              <div className={styles.inputWrap}>
                <Search size={18} className={styles.inputIcon} />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ชื่อ (ไม่ต้องใส่คำนำหน้า ภก.)"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className={styles.inputWrap}>
                <Search size={18} className={styles.inputIcon} />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="นามสกุล"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </>
          ) : (
            <div className={styles.inputWrap}>
              <Search size={18} className={styles.inputIcon} />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                className={styles.input}
                placeholder="เลขที่ใบอนุญาต (ใส่เฉพาะตัวเลข)"
                value={query}
                onChange={(e) => setQuery(normalizeLicenseDigits(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
          )}

          <button type="button" className={styles.searchButton} onClick={handleSearch}>
            ค้นหา
          </button>
        </div>
      </div>
    </div>
  );
}
