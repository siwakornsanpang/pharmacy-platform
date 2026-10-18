'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './product.module.css';
import { Search, Plus, Edit, Trash2, Image as ImageIcon, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { authFetch } from '@/app/utils/authFetch';
import ProductForm, { ProductItem } from './ProductForm';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/products`;

interface SortConfig {
    key: keyof ProductItem;
    direction: 'asc' | 'desc';
}

export default function ProductListPage() {
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

    // Filter & Sort States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const fetchProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await authFetch(API_URL);
            if (!res.ok) throw new Error('Failed to fetch products');
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถโหลดข้อมูลสินค้าได้',
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedProduct(null);
        setIsModalOpen(true);
    };

    const openEditModal = (product: ProductItem) => {
        setModalMode('edit');
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
    };

    const handleSaveSuccess = () => {
        closeModal();
        fetchProducts();
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบสินค้า?',
            text: 'ข้อมูลนี้จะถูกลบออกถาวรและไม่สามารถกู้คืนได้!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'ใช่, ลบเลย!',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            try {
                const res = await authFetch(`${API_URL}/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed to delete product');

                setProducts(prev => prev.filter(p => p.id !== id));
                Swal.fire('ลบสำเร็จ!', 'ข้อมูลสินค้าถูกลบเรียบร้อยแล้ว', 'success');
            } catch (err) {
                console.error(err);
                Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลสินค้าได้', 'error');
            }
        }
    };

    const handleSort = (key: keyof ProductItem) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const getSortIcon = (key: keyof ProductItem) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    // Extract unique categories dynamically for filtering and autocomplete suggestions
    const existingCategories = useMemo(() => {
        const categoriesSet = new Set<string>();
        products.forEach(p => {
            if (p.category) categoriesSet.add(p.category);
        });
        return Array.from(categoriesSet);
    }, [products]);

    // Filter & Sort Logic
    const processedProducts = useMemo(() => {
        let result = [...products];

        // Search Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p => p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query)));
        }

        // Category Filter
        if (selectedCategory !== 'all') {
            result = result.filter(p => p.category === selectedCategory);
        }

        // Sorting
        result.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];

            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;

            if (sortConfig.key === 'price') {
                return sortConfig.direction === 'asc'
                    ? parseFloat(a.price) - parseFloat(b.price)
                    : parseFloat(b.price) - parseFloat(a.price);
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [products, searchQuery, selectedCategory, sortConfig]);

    // Pagination Calculation
    const totalPages = Math.ceil(processedProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return processedProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [processedProducts, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>จัดการสินค้า</h1>
                <div className={styles.headerActions}>
                    <button onClick={openCreateModal} className={`${styles.btn} ${styles.btnPrimary}`}>
                        <Plus size={16} />
                        เพิ่มสินค้า
                    </button>
                </div>
            </div>

            {/* Filters and Controls */}
            <div className={styles.controls}>
                <div className={styles.searchBox}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        className={styles.inputSearch}
                        placeholder="ค้นหาด้วยชื่อสินค้า หรือรายละเอียด..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <select
                    className={styles.filterSelect}
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                >
                    <option value="all">ทุกประเภทสินค้า</option>
                    {existingCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Data Table */}
            <div className={styles.tableContainer}>
                {isLoading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        กำลังโหลดข้อมูลสินค้า...
                    </div>
                ) : paginatedProducts.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        ไม่พบข้อมูลสินค้า
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th} style={{ width: '80px' }}>รูปภาพ</th>
                                <th className={styles.th} onClick={() => handleSort('name')}>
                                    <div className={styles.thContent}>ชื่อสินค้า {getSortIcon('name')}</div>
                                </th>
                                <th className={styles.th} onClick={() => handleSort('category')}>
                                    <div className={styles.thContent}>ประเภทสินค้า {getSortIcon('category')}</div>
                                </th>
                                <th className={styles.th} style={{ width: '40%' }}>รายละเอียดสินค้า</th>
                                <th className={styles.th} onClick={() => handleSort('price')} style={{ width: '120px' }}>
                                    <div className={styles.thContent}>ราคา (บาท) {getSortIcon('price')}</div>
                                </th>
                                <th className={styles.th} style={{ width: '100px', textAlign: 'center' }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedProducts.map((product) => (
                                <tr key={product.id} className={styles.tr}>
                                    <td className={styles.td}>
                                        <div className={styles.thumbnailCell}>
                                            {product.imageUrl ? (
                                                <img src={product.imageUrl} alt={product.name} className={styles.thumbnail} />
                                            ) : (
                                                <ImageIcon className={styles.placeholderIcon} size={20} />
                                            )}
                                        </div>
                                    </td>
                                    <td className={styles.td} style={{ fontWeight: 500 }}>{product.name}</td>
                                    <td className={styles.td}>
                                        <span className={styles.categoryTag}>
                                            {product.category}
                                        </span>
                                    </td>
                                    <td className={styles.td} style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                        {product.description ? (
                                            product.description.length > 80
                                                ? `${product.description.substring(0, 80)}...`
                                                : product.description
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className={styles.td}>
                                        <span className={styles.priceText}>
                                            {parseFloat(product.price).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className={styles.td} style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => openEditModal(product)}
                                                className={styles.btnEditIcon}
                                                title="แก้ไข"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className={styles.btnDangerIcon}
                                                title="ลบ"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <div className={styles.paginationInfo}>
                        แสดง {(currentPage - 1) * ITEMS_PER_PAGE + 1} ถึง {Math.min(currentPage * ITEMS_PER_PAGE, processedProducts.length)} จาก {processedProducts.length} รายการ
                    </div>
                    <div className={styles.paginationPages}>
                        <button
                            className={styles.pageButton}
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                        >
                            ก่อนหน้า
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                className={`${styles.pageButton} ${currentPage === page ? styles.pageButtonActive : ''}`}
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            className={styles.pageButton}
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                        >
                            ถัดไป
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Dialog container for Product Form */}
            {isModalOpen && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <ProductForm
                            mode={modalMode}
                            initialData={selectedProduct}
                            onClose={closeModal}
                            onSaveSuccess={handleSaveSuccess}
                            existingCategories={existingCategories}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
