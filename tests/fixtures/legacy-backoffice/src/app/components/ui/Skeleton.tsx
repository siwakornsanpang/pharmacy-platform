import styles from "./Skeleton.module.css";

type SkeletonBlockProps = {
  width?: string;
  height?: string;
  radius?: string;
  circle?: boolean;
  className?: string;
};

export function SkeletonBlock({
  width = "100%",
  height = "1rem",
  radius,
  circle = false,
  className = "",
}: SkeletonBlockProps) {
  return (
    <span
      className={`${styles.skeleton} ${circle ? styles.circle : ""} ${className}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export function SkeletonPage() {
  return (
    <div className={styles.page} aria-label="กำลังโหลดข้อมูล">
      <div className={styles.stack}>
        <SkeletonBlock width="34%" height="2rem" />
        <SkeletonBlock width="48%" height="1rem" />
        <div className={styles.cardGrid}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.row}>
                <SkeletonBlock width="44px" height="44px" circle />
                <div className={styles.stack} style={{ flex: 1 }}>
                  <SkeletonBlock width="68%" height="0.9rem" />
                  <SkeletonBlock width="42%" height="1.35rem" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonMenu({ rows = 7 }: { rows?: number }) {
  return (
    <div className={styles.stack} aria-label="กำลังโหลดเมนู">
      {Array.from({ length: rows }).map((_, index) => (
        <span key={index} className={styles.menuItem} aria-hidden="true" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 3 }: { rows?: number; columns?: number }) {
  return (
    <div className={styles.table} aria-label="กำลังโหลดตาราง">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={styles.tableRow}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <SkeletonBlock
              key={columnIndex}
              width={columnIndex === 0 ? "82%" : "58%"}
              height="0.9rem"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
