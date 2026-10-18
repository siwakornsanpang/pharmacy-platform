import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { getNewsById } from '@/lib/api';
import styles from './news-detail.module.css';

interface NewsPageProps {
    params: Promise<{ id: string }>;
}

const categoryLabels: Record<string, string> = {
    news: 'ข่าวประชาสัมพันธ์',
    recruitment: 'ข่าวรับสมัครงานสภา',
    procurement: 'ข่าวประกาศจัดซื้อจัดจ้าง',
};

export async function generateMetadata({ params }: NewsPageProps): Promise<Metadata> {
    const { id } = await params;
    const news = await getNewsById(id);
    if (!news) return { title: 'ไม่พบข่าวสาร' };

    return {
        title: `${news.title} | สภาเภสัชกรรม`,
        description: news.content.substring(0, 160).replace(/<[^>]*>/g, ''),
    };
}

export default async function NewsDetailPage({ params }: NewsPageProps) {
    const { id } = await params;
    const news = await getNewsById(id);

    if (!news || news.status !== 'published') {
        notFound();
    }

    const formattedDate = new Date(news.publishedAt || news.createdAt).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <article className={styles.container}>
            <Link href="/news" className={styles.backBtn}>
                <ArrowLeft size={20} />
                <span>กลับไปหน้าข่าวสาร</span>
            </Link>

            <header className={styles.header}>
                <div className={styles.category}>
                    {categoryLabels[news.category] || news.category}
                </div>
                <h1 className={`${styles.title} ThaiFont`}>{news.title}</h1>
                <div className={styles.metadata}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Calendar size={16} />
                        <span>{formattedDate}</span>
                    </div>
                </div>
            </header>

            {news.thumbnailUrl && (
                <div className={styles.featuredImage}>
                    <Image
                        src={news.thumbnailUrl}
                        alt={news.title}
                        fill
                        priority
                        className={styles.image}
                    />
                </div>
            )}

            <div
                className={`${styles.richText} ThaiFont`}
                dangerouslySetInnerHTML={{ __html: news.content }}
            />
        </article>
    );
}
