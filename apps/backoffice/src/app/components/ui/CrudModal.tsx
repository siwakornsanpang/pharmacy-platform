'use client';

import React from 'react';
import styles from '@/app/backoffice/module/council-web/about/council/council.module.css';

interface CrudModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  maxWidth?: string;
  isDirty?: boolean;
}

/**
 * Shared CRUD Modal Shell
 * ใช้แทน modal overlay + header + form ที่ซ้ำกันทุกหน้า CRUD
 */
export default function CrudModal({ isOpen, title, onClose, onSubmit, children, maxWidth, isDirty }: CrudModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    if (isDirty) {
      import('sweetalert2').then((Swal) => {
        Swal.default.fire({
          title: 'ยืนยันการยกเลิก?',
          text: "การเปลี่ยนแปลงที่คุณแก้ไขจะถูกล้างทิ้ง",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          cancelButtonColor: '#3b82f6',
          confirmButtonText: 'ใช่, ยกเลิกการแก้ไข',
          cancelButtonText: 'กลับไปแก้ไข'
        }).then((result) => {
          if (result.isConfirmed) {
            onClose();
          }
        });
      });
    } else {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox} style={maxWidth ? { maxWidth } : undefined}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button onClick={handleClose} className={styles.btnClose}>✕</button>
        </div>
        <form onSubmit={onSubmit} className={styles.modalBody}>
          {children}
          <div style={{ paddingTop: '0.5rem', display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={handleClose} className={styles.btnCancel}>ยกเลิก</button>
            <button type="submit" className={styles.btnSubmit}>บันทึกข้อมูล</button>
          </div>
        </form>
      </div>
    </div>
  );
}
