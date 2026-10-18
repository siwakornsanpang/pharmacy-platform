import { ChevronLeft, ChevronRight, Download, ListFilter } from "lucide-react";
import { LawItem } from "@/lib/api";
import styles from "./LawsList.module.css";

interface LawsListProps {
  title: string;
  laws: LawItem[];
  totalCount: number;
  yearSort: "desc" | "asc";
  currentPage: number;
  totalPages: number;
  onYearSortToggle: () => void;
  onPageChange: (page: number) => void;
}

export default function LawsList({
  title,
  laws,
  totalCount,
  yearSort,
  currentPage,
  totalPages,
  onYearSortToggle,
  onPageChange,
}: LawsListProps) {
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  // จัดกลุ่มตามปี — ลำดับเริ่มใหม่ในแต่ละปี
  const groupedByYear: { year: number | null; items: LawItem[] }[] = [];
  laws.forEach((law) => {
    const year = law.year ?? null;
    const last = groupedByYear[groupedByYear.length - 1];
    if (last && last.year === year) {
      last.items.push(law);
    } else {
      groupedByYear.push({ year, items: [law] });
    }
  });

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={`${styles.title} ThaiFont`}>{title}</h2>
        <button
          className={`${styles.yearSort} ThaiFont`}
          onClick={onYearSortToggle}
        >
          <ListFilter size={16} />
          ปีที่ประกาศ {yearSort === "desc" ? "↓" : "↑"}
        </button>
      </div>

      <p className={`${styles.listLabel} ThaiFont`}>
        <span className={styles.listCount}>{totalCount} </span>
        รายการ
      </p>

      {laws.length === 0 ? (
        <div className={`${styles.emptyState} ThaiFont`}>
          ไม่พบข้อมูลกฎหมายในหมวดนี้
        </div>
      ) : (
        <div className={styles.list}>
          {groupedByYear.map((group) => (
            <div key={group.year ?? "none"} className={styles.yearGroup}>
              <div className={`${styles.yearHeading} ThaiFont`}>
                {group.year ? `พ.ศ. ${group.year}` : "ไม่ระบุปี"}
              </div>
              {group.items.map((law) => (
                <div key={law.id} className={styles.item}>
                  <Download size={16} className={styles.pdfIcon} aria-hidden />
                  {law.pdfUrl ? (
                    <a
                      href={law.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`${styles.itemLink} ThaiFont`}
                    >
                      {law.title}
                    </a>
                  ) : (
                    <span className={`${styles.itemTitle} ThaiFont`}>
                      {law.title}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={`${styles.pageBtn} ${
              currentPage === 1 ? styles.pageBtnDisabled : ""
            }`}
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </button>

          {getPageNumbers().map((page, idx) =>
            page === "..." ? (
              <span key={`ellipsis-${idx}`} className={styles.pageEllipsis}>
                ...
              </span>
            ) : (
              <button
                key={page}
                className={`${styles.pageBtn} ${
                  currentPage === page ? styles.pageBtnActive : ""
                }`}
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </button>
            )
          )}

          <button
            className={`${styles.pageBtn} ${
              currentPage === totalPages ? styles.pageBtnDisabled : ""
            }`}
            onClick={() =>
              currentPage < totalPages && onPageChange(currentPage + 1)
            }
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
