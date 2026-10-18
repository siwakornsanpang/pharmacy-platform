'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import { getRoleConfig } from '@/app/config/roles';

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

/**
 * Reusable Role Badge component
 * ใช้แทน getRoleBadge / getRoleBadgeClass ที่ซ้ำกันหลายไฟล์
 */
export default function RoleBadge({ role, size = 'sm', showIcon = true }: RoleBadgeProps) {
  const config = getRoleConfig(role);

  const sizeStyles = size === 'md'
    ? { padding: '0.25rem 0.75rem', fontSize: '0.8125rem' }
    : { padding: '0.2rem 0.625rem', fontSize: '0.75rem' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        borderRadius: '9999px',
        fontWeight: 500,
        color: config.color,
        backgroundColor: config.bg,
        ...sizeStyles,
      }}
    >
      {showIcon && <Shield size={size === 'md' ? 14 : 12} />}
      {config.label}
    </span>
  );
}
