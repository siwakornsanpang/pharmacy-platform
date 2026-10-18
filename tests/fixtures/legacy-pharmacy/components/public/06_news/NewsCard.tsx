import Image from 'next/image';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { News } from '@/lib/api';
import styles from './NewsCard.module.css';

interface NewsCardProps {
    news: News;
}

const categoryLabels: Record<string, string> = {
    news: 'ข่าวประชาสัมพันธ์',
    recruitment: 'ข่าวรับสมัครงานสภา',
    procurement: 'ข่าวประกาศจัดซื้อจัดจ้าง',
};

const categoryStyles: Record<string, { bg: string; text: string; border: string }> = {
    news: {
        bg: '#dbeafe',
        text: '#1e40af',
        border: '#bfdbfe',
    },
    recruitment: {
        bg: '#dcfce7',
        text: '#166534',
        border: '#bbf7d0',
    },
    procurement: {
        bg: '#ffedd5',
        text: '#9a3412',
        border: '#fed7aa',
    },
};

export default function NewsCard({ news }: NewsCardProps) {
    const formattedDate = new Date(news.publishedAt || news.createdAt).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const styleInfo = categoryStyles[news.category] || categoryStyles.news;

    return (
        <Link href={`/news/${news.id}`} className={styles.card}>
            <div className={styles.imageWrapper}>
                {news.thumbnailUrl ? (
                    <Image
                        src={news.thumbnailUrl}
                        alt={news.title}
                        fill
                        className={styles.image}
                    />
                ) : (
                    <div className={styles.placeholder}>
                        {/* Empty gray placeholder */}
                    </div>
                )}
            </div>
            <div className={styles.content}>
                <div className={styles.badgeRow}>
                    <span
                        className={styles.badge}
                        style={{
                            '--badge-bg': styleInfo.bg,
                            '--badge-color': styleInfo.text,
                            '--badge-border': styleInfo.border,
                        } as React.CSSProperties}
                    >
                        {categoryLabels[news.category] || news.category}
                    </span>
                    <span className={styles.date}>
                        <Calendar size={14} className={styles.dateIcon} />
                        {formattedDate}
                    </span>
                </div>
                <h3 className={styles.title}>{news.title}</h3>
                <p className={styles.excerpt}>
                    {news.excerpt}
                </p>
                <div className={styles.readMoreWrapper}>
                    <span className={`${styles.readMoreBtn} ThaiFont`}>อ่านเพิ่มเติม</span>
                </div>
            </div>
        </Link>
    );
}
