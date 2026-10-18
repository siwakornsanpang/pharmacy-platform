import styles from "./UIContent.module.css";

interface ContainerProps {
    children: React.ReactNode;
    className?: string;
    size?: "xl" | "2xl" | "default";
}

export default function Container({ children, className = "", size = "default" }: ContainerProps) {
    const sizeClass = size === "xl" ? styles.containerXl : size === "2xl" ? styles.container2Xl : styles.container;
    return (
        <div className={`${sizeClass} ${className}`}>
            {children}
        </div>
    );
}
