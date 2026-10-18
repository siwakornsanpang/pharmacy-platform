'use client';

import React from 'react';
import { Edit, ImageIcon, UploadCloud } from 'lucide-react';
import styles from '@/app/backoffice/module/council-web/about/council/council.module.css';

interface ImageUploaderProps {
  label?: string;
  preview: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Shared Image Uploader Widget
 * ใช้แทน image upload ที่ซ้ำกันใน council, history, agency
 */
export default function ImageUploader({ label, preview, onFileChange }: ImageUploaderProps) {
  return (
    <div className={styles.imageUploadContainer}>
      {label && (
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
      )}
      <label className={styles.imageUploadLabel}>
        <input
          type="file"
          hidden
          accept="image/*"
          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
          onChange={onFileChange}
        />
        <div className={styles.circleWrapper}>
          {preview ? (
            <>
              <img src={preview} className={styles.previewImage} alt="Preview" />
              <div className={styles.uploadOverlay}>
                <ImageIcon size={24} />
                <span style={{ fontSize: '0.75rem', fontWeight: 500, marginTop: '0.25rem' }}>เปลี่ยนรูป</span>
              </div>
            </>
          ) : (
            <div className={styles.placeholderContent}>
              <UploadCloud size={32} />
              <span style={{ fontSize: '0.75rem' }}>เพิ่มรูปภาพ</span>
            </div>
          )}
        </div>
        <span className={styles.helperText}>
          {preview ? (
            <><Edit size={14} /> คลิกที่รูปเพื่อเปลี่ยน</>
          ) : (
            'คลิกเพื่ออัปโหลดรูปภาพ'
          )}
        </span>
      </label>
    </div>
  );
}
