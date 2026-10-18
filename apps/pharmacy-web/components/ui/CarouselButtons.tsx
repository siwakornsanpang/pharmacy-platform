import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./UIContent.module.css";

interface CarouselButtonsProps {
    onPrev: () => void;
    onNext: () => void;
}

export default function CarouselButtons({ onPrev, onNext }: CarouselButtonsProps) {
    return (
        <div className={styles.navButtons}>
            <button className={styles.navBtn} onClick={onPrev} aria-label="Previous">
                <ChevronLeft size={20} />
            </button>
            <button className={styles.navBtn} onClick={onNext} aria-label="Next">
                <ChevronRight size={20} />
            </button>
        </div>
    );
}
