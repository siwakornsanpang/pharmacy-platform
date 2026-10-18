'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PublicProjectForm, { PublicProjectItem } from '../../PublicProjectForm';
import styles from '../../../../news/news.module.css';
import { getPublicProject, publicProjectLoadError } from '@/features/content/public-project/api';

export default function EditPublicProjectPage() {
  const { id } = useParams();
  const [initialData, setInitialData] = useState<PublicProjectItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchItem = async () => {
      try {
        setInitialData(await getPublicProject(Number(id)));
      } catch (err) {
        console.error(err);
        setError(publicProjectLoadError);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (error || !initialData) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#fa5252' }}>
          {error || 'ไม่พบข้อมูลโครงการของประชาชน'}
        </div>
      </div>
    );
  }

  return <PublicProjectForm mode="edit" initialData={initialData} />;
}

