'use client';

import React from 'react';
import { X } from 'lucide-react';
import styles from '@/app/backoffice/module/council-web/about/council/council.module.css';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

/**
 * Shared Image Preview Modal
 * ใช้แทน image preview popup ที่ซ้ำกันใน council, history, agency
 */
export default function ImagePreviewModal({ imageUrl, onClose }: ImagePreviewModalProps) {
  if (!imageUrl) return null;

  return (
    <div className={styles.imagePreviewOverlay} onClick={onClose}>
      <div className={styles.imagePreviewContent} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closePreviewBtn}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          title="ปิด"
        >
          <X size={32} />
        </button>
        <img src={imageUrl} alt="Full Size" className={styles.fullSizeImage} />
      </div>
    </div>
  );
}
