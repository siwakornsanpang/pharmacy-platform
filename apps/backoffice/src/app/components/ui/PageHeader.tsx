'use client';

import React from 'react';

interface PageHeaderProps {
  title: string;
  breadcrumb: string[];
}

/**
 * Reusable Page Header with breadcrumb
 * ใช้แทน header + breadcrumb ที่ซ้ำกันทุกหน้า
 */
export default function PageHeader({ title, breadcrumb }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2
        style={{
          fontSize: '1.875rem',
          fontWeight: 700,
          color: '#111827',
          margin: 0,
        }}
      >
        {title}
      </h2>
      {breadcrumb.length > 0 && (
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
          {breadcrumb.map((item, i) => (
            <span key={i}>
              {i < breadcrumb.length - 1 ? (
                <>{item} / </>
              ) : (
                <span style={{ color: '#2563eb', fontWeight: 500 }}>{item}</span>
              )}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
