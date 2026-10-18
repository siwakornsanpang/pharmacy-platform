"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, ChevronLeft, Eye, X, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../register.module.css";
import { authFetch } from "@/app/utils/authFetch";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Pharmacist = {
    id: string;
    title?: string;
    firstName: string;
    lastName: string;
    licenseNumber: string;
    province: string;
    status: string;
    idCardNumber?: string;
    idCardAddress?: string;
    contactAddress?: string;
    workplace?: string;
    address?: string; // Existing field (can be used for contact or kept for compatibility)
    expiryDate?: string;
    imageUrl?: string;
    requestNumber?: string;
    startDate?: string;
    endDate?: string;
};

export default function RegisterList() {
    const router = useRouter();
    const [pharmacists, setPharmacists] = useState<Pharmacist[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterProvince, setFilterProvince] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "license">("name");
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedPharmacist, setSelectedPharmacist] = useState<Pharmacist | null>(null);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchPharmacists = async () => {
            try {
                const res = await authFetch(
                    `${API_URL}/pharmacists`
                );
                if (!res.ok) throw new Error("Fetch failed");

                const data = await res.json();

                const mapped: Pharmacist[] = data.map((p: any) => {
                    const cleanName = (p.name || "")
                        .replace("ภก.", "")
                        .replace("ภญ.", "")
                        .trim();

                    const parts = cleanName.split(" ");

                    return {
                        id: String(p.id),
                        title: p.title || "",
                        firstName: parts[0] || "",
                        lastName: parts.slice(1).join(" ") || "",
                        licenseNumber: p.registrationId || "",
                        province: p.province || "",
                        status: p.status || "",
                        idCardNumber: p.idCardNumber || "",
                        idCardAddress: p.idCardAddress || "",
                        contactAddress: p.contactAddress || "",
                        workplace: p.workplace || "",
                        address: p.address || "",
                        expiryDate: p.expiryDate || "",
                        imageUrl: p.imageUrl || "",
                        requestNumber: p.requestNumber || "-",
                        startDate: p.startDate || "-",
                        endDate: p.expiryDate || p.endDate || "-"
                    };
                });

                setPharmacists(mapped);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPharmacists();
    }, []);

    const uniqueStatuses = useMemo(() => {
        return [...new Set(pharmacists.map((p) => p.status).filter(Boolean))];
    }, [pharmacists]);

    const uniqueProvinces = useMemo(() => {
        return [...new Set(pharmacists.map((p) => p.province).filter(Boolean))];
    }, [pharmacists]);

    const filteredPharmacists = useMemo(() => {
        return pharmacists
            .filter((p) => {
                const keyword = searchTerm.toLowerCase();

                const matchesSearch =
                    `${p.firstName} ${p.lastName}`.toLowerCase().includes(keyword) ||
                    p.licenseNumber.toLowerCase().includes(keyword);

                const matchesProvince =
                    !filterProvince || p.province === filterProvince;

                const matchesStatus =
                    !filterStatus || p.status === filterStatus;

                return matchesSearch && matchesProvince && matchesStatus;
            })
            .sort((a, b) => {
                if (sortBy === "name") {
                    return `${a.firstName}${a.lastName}`.localeCompare(
                        `${b.firstName}${b.lastName}`
                    );
                }
                return a.licenseNumber.localeCompare(b.licenseNumber);
            });
    }, [pharmacists, searchTerm, filterProvince, filterStatus, sortBy]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterProvince, filterStatus, sortBy]);

    // Pagination Calculations
    const totalPages = Math.ceil(filteredPharmacists.length / itemsPerPage);
    const paginatedPharmacists = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredPharmacists.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPharmacists, currentPage, itemsPerPage]);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const openDetails = (pharmacist: Pharmacist) => {
        router.push(`/backoffice/module/register/${pharmacist.id}`);
    };

    // Keyboard Navigation for Pagination
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input or textarea
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === "ArrowLeft") {
                if (currentPage > 1) {
                    handlePageChange(currentPage - 1);
                }
            } else if (e.key === "ArrowRight") {
                if (currentPage < totalPages) {
                    handlePageChange(currentPage + 1);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentPage, totalPages]);

    return (
        <div className={styles.container}>
            {/* Header */}
            <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <Link href="/backoffice/module/register" className={styles.backButton} style={{ display: 'flex', alignItems: 'center', color: '#6b7280', textDecoration: 'none' }}>
                        <ChevronLeft size={20} />
                        <span>กลับหน้าหลัก</span>
                    </Link>
                </div>
                <h1 className={styles.title}>รวมข้อมูลสมาชิก</h1>
                <p className={styles.breadcrumb}>
                    ทะเบียนเภสัชกร / <span className="text-blue-600 font-medium">รวมข้อมูลสมาชิก</span>
                </p>
            </div>

            {/* Filter Section */}
            <div className={styles.filterSection}>
                <h2 className={styles.filterTitle}>ตัวกรองและค้นหา</h2>
                <div className={styles.filterGrid}>
                    {/* Search */}
                    <div className={styles.filterInputWrapper}>
                        <Search size={16} className={styles.filterInputIcon} />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อ / เลขทะเบียน"
                            className={styles.filterInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Province */}
                    <select
                        value={filterProvince}
                        onChange={(e) => setFilterProvince(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="">ทั้งหมด - จังหวัด</option>
                        {uniqueProvinces.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>

                    {/* Status */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="">ทั้งหมด - สถานะ</option>
                        {uniqueStatuses.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className={styles.tableCardContainer}>
                <div className={styles.horizontalTableWrapper}>
                    <table className={styles.horizontalTable}>
                        <thead>
                            <tr>
                                <th>เลขใบประกอบ</th>
                                <th>ชื่อ</th>
                                <th>นามสกุล</th>
                                <th>ที่อยู่</th>
                                <th>ที่ทำงาน</th>
                                <th>เลขที่คำร้องขอ</th>
                                <th>เลขที่ใบประกอบ (ชุด)</th>
                                <th>วันที่เริ่มต้น</th>
                                <th>วันที่สิ้นสุด</th>
                                <th>สถานะ</th>
                                <th>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={11} className={styles.emptyState}>
                                        กำลังโหลดข้อมูล...
                                    </td>
                                </tr>
                            ) : paginatedPharmacists.length > 0 ? (
                                paginatedPharmacists.map((p) => (
                                    <tr key={p.id}>
                                        <td>{p.licenseNumber}</td>
                                        <td>{p.firstName}</td>
                                        <td>{p.lastName}</td>
                                        <td style={{ textAlign: 'left', minWidth: '200px' }}>{p.contactAddress || p.address || "-"}</td>
                                        <td>{p.workplace || "-"}</td>
                                        <td>{p.requestNumber}</td>
                                        <td>{p.licenseNumber}</td>
                                        <td>{p.startDate}</td>
                                        <td>{p.endDate}</td>
                                        <td>
                                            <span
                                                className={`${styles.statusBadge} ${p.status === "ใช้งาน"
                                                    ? styles.statusActive
                                                    : p.status === "พักใช้ใบอนุญาต"
                                                        ? styles.statusSuspended
                                                        : styles.statusInactive
                                                    }`}
                                            >
                                                {p.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={styles.viewDetailBtn}
                                                onClick={() => openDetails(p)}
                                            >
                                                <Eye size={14} />
                                                <span>ดูรายละเอียด</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={11} className={styles.emptyState}>
                                        ไม่พบข้อมูล
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredPharmacists.length > 0 && (
                    <div className={styles.tableFooter}>
                        <div className={styles.paginationInfo}>
                            แสดง {Math.min((currentPage - 1) * itemsPerPage + 1, filteredPharmacists.length)} - {Math.min(currentPage * itemsPerPage, filteredPharmacists.length)} จาก {filteredPharmacists.length} รายการ
                        </div>

                        <div className={styles.paginationControls}>
                            <button
                                className={styles.pageBtn}
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                ก่อนหน้า
                            </button>

                            <div className={styles.pageNumbers}>
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        className={`${styles.pageNum} ${currentPage === i + 1 ? styles.pageNumActive : ''}`}
                                        onClick={() => handlePageChange(i + 1)}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>

                            <button
                                className={styles.pageBtn}
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                ถัดไป
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
