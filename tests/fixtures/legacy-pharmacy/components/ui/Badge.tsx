import styles from "./UIContent.module.css";

interface BadgeProps {
    children: React.ReactNode;
    active?: boolean;
}

export default function Badge({ children, active = false }: BadgeProps) {
    return (
        <span className={`${styles.badge} ${active ? styles.badgeActive : ""}`}>
            {children}
        </span>
    );
}
