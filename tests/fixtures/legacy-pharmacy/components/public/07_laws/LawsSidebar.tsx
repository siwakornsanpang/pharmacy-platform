import styles from "./LawsSidebar.module.css";

interface Category {
  key: string;
  label: string;
}

interface LawsSidebarProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (key: string) => void;
}

export default function LawsSidebar({
  categories,
  activeCategory,
  onCategoryChange,
}: LawsSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <h3 className={`${styles.title} ThaiFont`}>ประเภทกฎหมาย</h3>
      <nav className={styles.nav}>
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={`${styles.link} ThaiFont ${
              activeCategory === cat.key ? styles.linkActive : ""
            }`}
            onClick={() => onCategoryChange(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
