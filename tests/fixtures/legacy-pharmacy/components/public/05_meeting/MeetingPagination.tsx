import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./MeetingPagination.module.css";

interface MeetingPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function MeetingPagination({ currentPage, totalPages, onPageChange }: MeetingPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={styles.pagination}>
      <button 
        className={styles.arrowBtn}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft size={20} />
      </button>
      
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          className={`${styles.pageBtn} ${currentPage === page ? styles.activePage : ""}`}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}

      <button 
        className={styles.arrowBtn}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
