'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import MedicineForm, { MedicineItem } from '../../MedicineForm';
import styles from '../../../../news/news.module.css';
import { getMedicine, medicineLoadError } from '@/features/content/medicine/api';

export default function EditMedicinePage() {
  const { id } = useParams();
  const [initialData, setInitialData] = useState<MedicineItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchItem = async () => {
      try {
        setInitialData(await getMedicine(Number(id)));
      } catch (err) {
        console.error(err);
        setError(medicineLoadError);
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
          {error || 'ไม่พบข้อมูลความรู้เรื่องยา'}
        </div>
      </div>
    );
  }

  return <MedicineForm mode="edit" initialData={initialData} />;
}

