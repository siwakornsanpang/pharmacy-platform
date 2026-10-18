'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, Users } from 'lucide-react';
import Swal from 'sweetalert2';
import { authFetch } from '@/app/utils/authFetch';
import RoleBadge from '@/app/components/ui/RoleBadge';
import CrudModal from '@/app/components/ui/CrudModal';
import { SkeletonTable } from '@/app/components/ui/Skeleton';
import styles from '../users.module.css';
import councilStyles from '@/app/backoffice/module/council-web/about/council/council.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type User = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  createdAt: string;
};

type RoleResponse = {
  role: string;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    role: 'viewer',
  });

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await authFetch(`${API_URL}/auth/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/permissions/roles`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRoleOptions(data.map((r: RoleResponse) => ({ value: r.role, label: r.role })));
        }
      }
    } catch (err) {
      console.error('Failed to fetch roles', err);
      setRoleOptions([
        { value: 'admin', label: 'admin' },
        { value: 'editor', label: 'editor' },
        { value: 'viewer', label: 'viewer' },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const openModal = () => {
    setFormData({ username: '', password: '', displayName: '', role: roleOptions[0]?.value || 'viewer' });
    setIsModalOpen(true);
  };

  // Create user
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.password.trim()) {
      Swal.fire('กรุณากรอกข้อมูล', 'ชื่อผู้ใช้และรหัสผ่านจำเป็นต้องกรอก', 'warning');
      return;
    }

    try {
      const res = await authFetch(`${API_URL}/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
          displayName: formData.displayName.trim() || formData.username.trim(),
          role: formData.role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire('ไม่สำเร็จ', data.message || 'ไม่สามารถสร้างผู้ใช้ได้', 'error');
        return;
      }

      Swal.fire({ icon: 'success', title: 'สร้างผู้ใช้สำเร็จ', text: `${data.user.displayName} (${data.user.role})`, timer: 2000, showConfirmButton: false });
      setIsModalOpen(false);
      fetchUsers();
    } catch {
      Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  // Delete user
  const handleDeleteUser = async (user: User) => {
    const result = await Swal.fire({
      title: `ลบผู้ใช้ "${user.displayName}"?`,
      text: 'การดำเนินการนี้ไม่สามารถย้อนกลับได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const res = await authFetch(`${API_URL}/auth/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        Swal.fire('ไม่สำเร็จ', data.message || 'ไม่สามารถลบผู้ใช้ได้', 'error');
        return;
      }

      Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1500, showConfirmButton: false });
      fetchUsers();
    } catch {
      Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>จัดการผู้ใช้งาน</h2>
          <p className={styles.breadcrumb}>
            ตั้งค่า / <span style={{ color: '#2563eb', fontWeight: 500 }}>จัดการผู้ใช้งาน</span>
          </p>
        </div>
        <button onClick={openModal} className={`${styles.btn} ${styles.btnPrimary}`}>
          <UserPlus size={16} /> สร้างผู้ใช้ใหม่
        </button>
      </div>

      {/* User List */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>
          <Users size={20} color="#2563eb" />
          ผู้ใช้ทั้งหมด ({users.length})
        </h3>

        {isLoading ? (
          <div className={styles.skeletonArea}>
            <SkeletonTable rows={6} columns={4} />
          </div>
        ) : users.length === 0 ? (
          <div className={styles.emptyState}>ยังไม่มีผู้ใช้ในระบบ</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ผู้ใช้</th>
                  <th>บทบาท</th>
                  <th>วันที่สร้าง</th>
                  <th style={{ width: 80, textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.userInfo}>
                        <div className={styles.avatar}>
                          {(user.displayName || user.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.userName}>{user.displayName}</div>
                          <div className={styles.userUsername}>@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <RoleBadge role={user.role} />
                    </td>
                    <td>
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })
                        : '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={() => handleDeleteUser(user)}
                        title="ลบผู้ใช้"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <CrudModal
        isOpen={isModalOpen}
        title="สร้างผู้ใช้ใหม่"
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        maxWidth="32rem"
      >
        <div className={councilStyles.gridTwo}>
          <div className={councilStyles.formGroup}>
            <label className={councilStyles.formLabel}>ชื่อผู้ใช้ (Username) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input
              type="text"
              required
              className={councilStyles.formInput}
              placeholder="เช่น webeditor01"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>
          <div className={councilStyles.formGroup}>
            <label className={councilStyles.formLabel}>รหัสผ่าน <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input
              type="password"
              required
              className={councilStyles.formInput}
              placeholder="กรอกรหัสผ่าน"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
        </div>

        <div className={councilStyles.gridTwo}>
          <div className={councilStyles.formGroup}>
            <label className={councilStyles.formLabel}>ชื่อที่แสดง</label>
            <input
              type="text"
              className={councilStyles.formInput}
              placeholder="เช่น สมชาย ใจดี"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            />
          </div>
          <div className={councilStyles.formGroup}>
            <label className={councilStyles.formLabel}>บทบาท (Role)</label>
            <select
              className={councilStyles.formSelect}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </CrudModal>
    </div>
  );
}
