import styles from "./UIContent.module.css";

interface DotPaginationProps {
    total: number;
    active: number;
    onClick: (index: number) => void;
}

export default function DotPagination({ total, active, onClick }: DotPaginationProps) {
    return (
        <div className={styles.dots}>
            {Array.from({ length: total }).map((_, i) => (
                <button
                    key={i}
                    className={`${styles.dot} ${i === active ? styles.dotActive : ""}`}
                    onClick={() => onClick(i)}
                    aria-label={`Go to slide ${i + 1}`}
                />
            ))}
        </div>
    );
}
