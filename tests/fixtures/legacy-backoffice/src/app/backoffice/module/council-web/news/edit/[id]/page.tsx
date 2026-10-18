'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import NewsForm, { NewsItem } from '../../NewsForm';
import styles from '../../news.module.css';
import { authFetch } from '@/app/utils/authFetch';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/news`;

export default function EditNewsPage() {
    const { id } = useParams();
    const [initialData, setInitialData] = useState<NewsItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchNewsItem = async () => {
            try {
                const res = await authFetch(`${API_URL}/${id}`);
                if (!res.ok) throw new Error('Failed to fetch news item');
                const data = await res.json();
                setInitialData(data);
            } catch (err) {
                console.error(err);
                setError('ไม่สามารถโหลดข้อมูลข่าวได้');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNewsItem();
    }, [id]);

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                    กำลังโหลดข้อมูล...
                </div>
            </div>
        );
    }

    if (error || !initialData) {
        return (
            <div className={styles.container}>
                <div style={{ padding: '2rem', textAlign: 'center', color: '#fa5252' }}>
                    {error || 'ไม่พบข้อมูลข่าว'}
                </div>
            </div>
        );
    }

    return <NewsForm mode="edit" initialData={initialData} />;
}
