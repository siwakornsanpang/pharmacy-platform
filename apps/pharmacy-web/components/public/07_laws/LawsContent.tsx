"use client";

import { useState, useMemo } from "react";
import { LawItem } from "@/features/content/browser-api";
import LawsSearch from "./LawsSearch";
import LawsSidebar from "./LawsSidebar";
import LawsList from "./LawsList";
import styles from "@/app/(public)/07_laws/laws.module.css";

const CATEGORIES = [
  { key: "law1", label: "พระราชบัญญัติวิชาชีพเภสัชกรรม" },
  { key: "law2", label: "ข้อบังคับสภาเภสัชกรรม" },
  { key: "law4", label: "กฎกระทรวง" },
  { key: "law3", label: "ประกาศสภาเภสัชกรรม" },
  { key: "law5", label: "กฎหมายอื่นที่เกี่ยวข้อง" },
  { key: "law6", label: "คำสั่งสภาเภสัชกรรม" },
  { key: "law7", label: "ระเบียบสภาเภสัชกรรม" },
];

const ITEMS_PER_PAGE = 20;

interface LawsContentProps {
  allLaws: Record<string, LawItem[]>;
}

export default function LawsContent({ allLaws }: LawsContentProps) {
  const [activeCategory, setActiveCategory] = useState("law1");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [yearSort, setYearSort] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);

  const currentLaws = allLaws[activeCategory] || [];

  const availableYears = useMemo(() => {
    const years = currentLaws
      .map((l) => l.year)
      .filter((y): y is number => y !== null);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [currentLaws]);

  const filteredLaws = useMemo(() => {
    let result = [...currentLaws];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((law) => law.title.toLowerCase().includes(q));
    }
    if (yearFilter !== "all") {
      result = result.filter((law) => law.year === parseInt(yearFilter));
    }
    // เรียงตามปี (สลับได้) แล้วตามลำดับจากหลังบ้าน จากนั้น id เพื่อความเสถียร
    result.sort((a, b) => {
      const yearA = a.year ?? 0;
      const yearB = b.year ?? 0;
      if (yearA !== yearB) {
        return yearSort === "desc" ? yearB - yearA : yearA - yearB;
      }
      if (a.order !== b.order) return a.order - b.order;
      return a.id - b.id;
    });
    return result;
  }, [currentLaws, searchQuery, yearFilter, yearSort]);

  const totalPages = Math.ceil(filteredLaws.length / ITEMS_PER_PAGE);
  const paginatedLaws = filteredLaws.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleCategoryChange = (key: string) => {
    setActiveCategory(key);
    setCurrentPage(1);
    setSearchQuery("");
    setYearFilter("all");
  };

  const activeLabel =
    CATEGORIES.find((c) => c.key === activeCategory)?.label || "";

  return (
    <>
      <LawsSearch
        categories={CATEGORIES}
        categoryFilter={categoryFilter}
        yearFilter={yearFilter}
        availableYears={availableYears}
        searchQuery={searchQuery}
        catDropdownOpen={catDropdownOpen}
        yearDropdownOpen={yearDropdownOpen}
        onCategoryFilterChange={(key) => {
          setCategoryFilter(key);
          if (key !== "all") {
            setActiveCategory(key);
          }
          setCatDropdownOpen(false);
          setCurrentPage(1);
        }}
        onYearFilterChange={(year) => {
          setYearFilter(year);
          setYearDropdownOpen(false);
          setCurrentPage(1);
        }}
        onSearchQueryChange={setSearchQuery}
        onCatDropdownToggle={() => {
          setCatDropdownOpen(!catDropdownOpen);
          setYearDropdownOpen(false);
        }}
        onYearDropdownToggle={() => {
          setYearDropdownOpen(!yearDropdownOpen);
          setCatDropdownOpen(false);
        }}
        onSearch={() => setCurrentPage(1)}
      />

      <div className={styles.layoutContainer}>
        <LawsSidebar
          categories={CATEGORIES}
          activeCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
        />

        <LawsList
          title={activeLabel}
          laws={paginatedLaws}
          totalCount={filteredLaws.length}
          yearSort={yearSort}
          currentPage={currentPage}
          totalPages={totalPages}
          onYearSortToggle={() => {
            setYearSort((s) => (s === "desc" ? "asc" : "desc"));
            setCurrentPage(1);
          }}
          onPageChange={setCurrentPage}
        />
      </div>
    </>
  );
}
