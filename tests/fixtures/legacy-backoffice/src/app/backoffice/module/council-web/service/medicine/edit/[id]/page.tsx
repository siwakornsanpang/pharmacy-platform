'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import MedicineForm, { MedicineItem } from '../../MedicineForm';
import styles from '../../../../news/news.module.css';
import { authFetch } from '@/app/utils/authFetch';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/medicine`;

export default function EditMedicinePage() {
  const { id } = useParams();
  const [initialData, setInitialData] = useState<MedicineItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchItem = async () => {
      try {
        const res = await authFetch(`${API_URL}/${id}`);
        if (!res.ok) throw new Error('Failed to fetch medicine item');
        const data = await res.json();
        setInitialData(data);
      } catch (err) {
        console.error(err);
        setError('ไม่สามารถโหลดข้อมูลความรู้เรื่องยาได้');
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

