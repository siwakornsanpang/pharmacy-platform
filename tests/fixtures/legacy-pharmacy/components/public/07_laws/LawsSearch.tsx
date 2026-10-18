import { Search, ChevronDown, ListFilter } from "lucide-react";
import styles from "./LawsSearch.module.css";

interface Category {
  key: string;
  label: string;
}

interface LawsSearchProps {
  categories: Category[];
  categoryFilter: string;
  yearFilter: string;
  availableYears: number[];
  searchQuery: string;
  catDropdownOpen: boolean;
  yearDropdownOpen: boolean;
  onCategoryFilterChange: (key: string) => void;
  onYearFilterChange: (year: string) => void;
  onSearchQueryChange: (query: string) => void;
  onCatDropdownToggle: () => void;
  onYearDropdownToggle: () => void;
  onSearch: () => void;
}

export default function LawsSearch({
  categories,
  categoryFilter,
  yearFilter,
  availableYears,
  searchQuery,
  catDropdownOpen,
  yearDropdownOpen,
  onCategoryFilterChange,
  onYearFilterChange,
  onSearchQueryChange,
  onCatDropdownToggle,
  onYearDropdownToggle,
  onSearch,
}: LawsSearchProps) {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.wrapper}>
        <h2 className={`${styles.title} ThaiFont`}>ค้นหากฎหมาย</h2>
        <div className={styles.row}>
          {/* Category dropdown */}
          <div className={styles.dropdown}>
            <button
              type="button"
              className={`${styles.dropdownBtn} ThaiFont`}
              onClick={onCatDropdownToggle}
            >
              <ListFilter size={16} />
              <span>
                {categoryFilter === "all"
                  ? "ทั้งหมด"
                  : categories.find((c) => c.key === categoryFilter)?.label}
              </span>
              <ChevronDown size={16} />
            </button>
            {catDropdownOpen && (
              <ul className={styles.dropdownMenu}>
                <li>
                  <button
                    className={`${styles.dropdownItem} ThaiFont ${categoryFilter === "all" ? styles.dropdownItemActive : ""
                      }`}
                    onClick={() => onCategoryFilterChange("all")}
                  >
                    ทั้งหมด
                  </button>
                </li>
                {categories.map((cat) => (
                  <li key={cat.key}>
                    <button
                      className={`${styles.dropdownItem} ThaiFont ${categoryFilter === cat.key ? styles.dropdownItemActive : ""
                        }`}
                      onClick={() => onCategoryFilterChange(cat.key)}
                    >
                      {cat.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Year dropdown */}
          <div className={styles.dropdown}>
            <button
              type="button"
              className={`${styles.dropdownBtn} ThaiFont`}
              onClick={onYearDropdownToggle}
            >
              <ListFilter size={16} />
              <span>
                {yearFilter === "all" ? "ปีที่ประกาศ" : `พ.ศ. ${yearFilter}`}
              </span>
              <ChevronDown size={16} />
            </button>
            {yearDropdownOpen && (
              <ul className={styles.dropdownMenu}>
                <li>
                  <button
                    className={`${styles.dropdownItem} ThaiFont ${yearFilter === "all" ? styles.dropdownItemActive : ""
                      }`}
                    onClick={() => onYearFilterChange("all")}
                  >
                    ทั้งหมด
                  </button>
                </li>
                {availableYears.map((y) => (
                  <li key={y}>
                    <button
                      className={`${styles.dropdownItem} ThaiFont ${yearFilter === y.toString() ? styles.dropdownItemActive : ""
                        }`}
                      onClick={() => onYearFilterChange(y.toString())}
                    >
                      พ.ศ. {y}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Keyword input */}
          <div className={styles.inputWrap}>
            <Search size={18} className={styles.inputIcon} />
            <input
              type="text"
              placeholder="ค้นหาจาก Keywords"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />
          </div>

          <button className={`${styles.searchBtn} ThaiFont`} onClick={onSearch}>
            ค้นหา
          </button>
        </div>
        </div>
      </div>
    </section>
  );
}
