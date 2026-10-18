"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ListFilter,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import MeetingPagination from "@/components/public/05_meeting/MeetingPagination";
import styles from "./LicenseSearch.module.css";
import pageStyles from "./LicenseSearchResults.module.css";
import {
  PharmacistData,
  SearchType,
  searchOptions,
  mockPharmacistsList,
  buildLicenseSearchPath,
  buildLicenseDetailPath,
  normalizeLicenseDigits,
  stripNameTitles,
} from "./licenseSearchShared";

function getRowStatus(item: PharmacistData) {
  if (item.statusType === "abnormal") {
    return {
      label: "ไม่ปกติ",
      className: pageStyles.statusAbnormal,
      Icon: AlertTriangle,
    };
  }
  return {
    label: "ปกติ",
    className: pageStyles.statusNormal,
    Icon: CheckCircle2,
  };
}

const ITEMS_PER_PAGE = 10;

function isExactLicenseMatch(licenseValue: string, searchTerm: string) {
  const licenseDigits = normalizeLicenseDigits(licenseValue);
  const searchDigits = normalizeLicenseDigits(searchTerm);
  if (!searchDigits) return false;
  return licenseDigits === searchDigits;
}

function matchesNameKeywords(itemName: string, searchTerm: string) {
  const searchWords = stripNameTitles(searchTerm)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!searchWords.length) return false;
  const cleanName = stripNameTitles(itemName).toLowerCase();
  return searchWords.every((word) => cleanName.includes(word));
}

async function fetchPharmacistResults(
  searchType: SearchType,
  searchTerm: string
): Promise<PharmacistData[]> {
  if (searchType === "license") {
    return mockPharmacistsList.filter((item) =>
      isExactLicenseMatch(item.licenseNo, searchTerm)
    );
  }

  return mockPharmacistsList.filter((item) =>
    matchesNameKeywords(item.name, searchTerm)
  );
}

function LicenseSearchResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialType = (searchParams.get("type") === "name" ? "name" : "license") as SearchType;
  const initialQuery =
    initialType === "license"
      ? normalizeLicenseDigits(searchParams.get("q") || "")
      : searchParams.get("q") || "";
  const initialFirst = stripNameTitles(searchParams.get("first") || "");
  const initialLast = stripNameTitles(searchParams.get("last") || "");

  const [searchType, setSearchType] = useState<SearchType>(initialType);
  const [query, setQuery] = useState(initialQuery);
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<PharmacistData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const selectedOption = searchOptions.find((o) => o.value === searchType)!;
  const currentSearchQuery = searchParams.toString();

  const activeTerm = useMemo(() => {
    if (initialType === "license") return initialQuery.trim();
    return `${initialFirst.trim()} ${initialLast.trim()}`.trim();
  }, [initialType, initialQuery, initialFirst, initialLast]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!activeTerm) {
        setSearchResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setCurrentPage(1);

      const results = await fetchPharmacistResults(initialType, activeTerm);
      if (!cancelled) {
        setSearchResults(results);
        setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [activeTerm, initialType]);

  const totalPages = Math.max(1, Math.ceil(searchResults.length / ITEMS_PER_PAGE));
  const pageItems = searchResults.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

  const handleResetSearch = () => {
    setQuery("");
    setFirstName("");
    setLastName("");
    router.push("/");
  };

  return (
    <div className={pageStyles.pageInner}>
      <Link href="/" className={pageStyles.backBtn}>
        <ChevronLeft size={18} />
        <span>ย้อนกลับหน้าแรก</span>
      </Link>

      <div className={`${styles.searchBoxCard} ${pageStyles.searchCard}`}>
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

          <button
            type="button"
            className={styles.searchButton}
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 size={18} className={styles.spinner} /> : "ค้นหา"}
          </button>
        </div>
      </div>

      <div className={styles.resultsContainer}>
        <h3 className={styles.resultTitle}>
          ผลการค้นหา{" "}
          {!isLoading && searchResults.length > 0 ? `${searchResults.length} รายการ` : ""}
        </h3>

        {isLoading ? (
          <div className={pageStyles.loadingBox}>
            <Loader2 size={28} className={styles.spinner} />
            <span>กำลังค้นหาข้อมูล...</span>
          </div>
        ) : searchResults.length > 0 ? (
          <div className={styles.resultsList}>
            <div className={pageStyles.tableWrap}>
              <table className={pageStyles.resultsTable}>
                <thead>
                  <tr>
                    <th className={pageStyles.colIndex}>ลำดับ</th>
                    <th>เลขที่ใบอนุญาต</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>สถานะ</th>
                    <th className={pageStyles.colAction}></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item, index) => {
                    const rowNumber =
                      (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    const fullName = `${item.title ? `${item.title} ` : ""}${item.name}`;
                    const detailHref = buildLicenseDetailPath(
                      item.id ?? rowNumber,
                      currentSearchQuery
                    );
                    const status = getRowStatus(item);
                    const StatusIcon = status.Icon;

                    return (
                      <tr key={item.id || index}>
                        <td className={pageStyles.indexCell}>{rowNumber}</td>
                        <td className={pageStyles.licenseCell}>{item.licenseNo}</td>
                        <td className={pageStyles.nameCell}>{fullName}</td>
                        <td>
                          <span className={status.className}>
                            <StatusIcon size={16} />
                            {status.label}
                          </span>
                        </td>
                        <td className={pageStyles.actionCell}>
                          <Link href={detailHref} className={pageStyles.detailBtn}>
                            ดูรายละเอียด
                            <ChevronRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={pageStyles.paginationWrap}>
                <MeetingPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyCard}>
            <h4 className={styles.emptyTitle}>ไม่พบข้อมูลที่ค้นหา</h4>
            <p className={styles.emptySubtitle}>
              ไม่พบข้อมูลผู้ประกอบวิชาชีพเภสัชกรรมที่ตรงกับคำค้นหา
            </p>
            <button type="button" className={styles.resetButton} onClick={handleResetSearch}>
              <RotateCcw size={16} />
              <span>กลับหน้าแรกเพื่อค้นหาใหม่</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LicenseSearchResults() {
  return (
    <Suspense
      fallback={
        <div className={pageStyles.loadingBox}>
          <Loader2 size={28} className={styles.spinner} />
          <span>กำลังโหลด...</span>
        </div>
      }
    >
      <LicenseSearchResultsInner />
    </Suspense>
  );
}
