import Image from 'next/image';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { PublicProject } from '@/lib/api';
import styles from './PeopleProjectCard.module.css';

interface PeopleProjectCardProps {
    project: PublicProject;
}

export default function PeopleProjectCard({ project }: PeopleProjectCardProps) {
    const formattedDate = new Date(project.publishedAt || project.createdAt).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <Link href={`/service/people-project/${project.id}`} className={styles.card}>
            <div className={styles.imageWrapper}>
                {project.thumbnailUrl ? (
                    <Image
                        src={project.thumbnailUrl}
                        alt={project.title}
                        fill
                        className={styles.image}
                    />
                ) : (
                    <div className={styles.placeholder}>
                        {/* Empty placeholder */}
                    </div>
                )}
            </div>
            <div className={styles.content}>
                <div className={styles.badgeRow}>
                    <span className={styles.badge}>
                        โครงการประชาชน
                    </span>
                    <span className={styles.date}>
                        <Calendar size={14} className={styles.dateIcon} />
                        {formattedDate}
                    </span>
                </div>
                <h3 className={styles.title}>{project.title}</h3>
                <p className={styles.excerpt}>
                    {project.excerpt}
                </p>
                <div className={styles.readMoreWrapper}>
                    <span className={`${styles.readMoreBtn} ThaiFont`}>อ่านเพิ่มเติม</span>
                </div>
            </div>
        </Link>
    );
}
