import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';
import { getPublicProjectById } from '@/lib/api';
import styles from './people-project-detail.module.css';

interface ProjectPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
    const { id } = await params;
    const project = await getPublicProjectById(id);
    if (!project) return { title: 'ไม่พบโครงการ' };

    return {
        title: `${project.title} | สภาเภสัชกรรม`,
        description: project.excerpt || project.content.substring(0, 160).replace(/<[^>]*>/g, ''),
    };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
    const { id } = await params;
    const project = await getPublicProjectById(id);

    if (!project || project.status !== 'published') {
        notFound();
    }

    const formattedDate = new Date(project.publishedAt || project.createdAt).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <article className={styles.container}>
            <Link href="/service/people-project" className={styles.backBtn}>
                <ArrowLeft size={20} />
                <span>กลับไปหน้าโครงการประชาชน</span>
            </Link>

            <header className={styles.header}>
                <div className={styles.category}>
                    โครงการประชาชน
                </div>
                <h1 className={`${styles.title} ThaiFont`}>{project.title}</h1>
                <div className={styles.metadata}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Calendar size={16} />
                        <span>{formattedDate}</span>
                    </div>
                </div>
            </header>

            {project.thumbnailUrl && (
                <div className={styles.featuredImage}>
                    <Image
                        src={project.thumbnailUrl}
                        alt={project.title}
                        fill
                        priority
                        className={styles.image}
                    />
                </div>
            )}

            <div
                className={`${styles.richText} ThaiFont`}
                dangerouslySetInnerHTML={{ __html: project.content }}
            />
        </article>
    );
}
