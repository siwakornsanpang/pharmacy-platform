"use client";

import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, Printer, Mail } from 'lucide-react';
import styles from './ProductCard.module.css';

export interface Product {
    id: number;
    name: string;
    imageUrl: string;
    category: string;
    description: string;
    price: string | number;
}

interface ProductCardProps {
    product: Product;
}

const CONTACT_INFO = {
    title: 'ติดต่อสภาเภสัชกรรม',
    office: 'สำนักงานเลขาธิการสภาเภสัชกรรม อาคารมหิตลาธิเบศร ชั้น 8 กระทรวงสาธารณสุข',
    address: 'เลขที่ 88/19 หมู่ 4 ถนนติวานนท์ ตำบลตลาดขวัญ อำเภอเมือง จังหวัดนนทบุรี 11000',
    phone: '0 2591 9992 (คู่สายอัตโนมัติ)',
    fax: '0 2591 9996',
    email: 'pharthai@pharmacycouncil.org',
};

export default function ProductCard({ product }: ProductCardProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!isModalOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsModalOpen(false);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [isModalOpen]);

    return (
        <>
            <button
                type="button"
                className={styles.card}
                onClick={() => setIsModalOpen(true)}
                aria-label={`ดูรายละเอียด ${product.name}`}
            >
                <div className={styles.imageWrapper}>
                    {product.imageUrl ? (
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            className={styles.image}
                        />
                    ) : (
                        <div className={styles.imagePlaceholder} />
                    )}
                </div>

                <div className={styles.info}>
                    <div className={styles.categoryWrapper}>
                        <p className={`${styles.category} ThaiFont`}>{product.category}</p>
                    </div>

                    <div className={styles.namePriceRow}>
                        <h3 className={`${styles.name} ThaiFont`}>{product.name}</h3>
                        <span className={styles.price}>
                            <span className={styles.currency}>฿</span>
                            {Number(product.price).toLocaleString()}
                        </span>
                    </div>
                </div>
            </button>

            {isModalOpen && (
                <div
                    className={styles.modalOverlay}
                    onClick={() => setIsModalOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={`product-title-${product.id}`}
                >
                    <div
                        className={styles.modalContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className={styles.closeBtn}
                            onClick={() => setIsModalOpen(false)}
                            aria-label="ปิด"
                        >
                            <X size={20} />
                        </button>

                        <div className={styles.modalLayout}>
                            <div className={styles.modalImageWrap}>
                                {product.imageUrl ? (
                                    <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className={styles.modalImage}
                                    />
                                ) : (
                                    <div className={styles.modalImagePlaceholder} />
                                )}
                            </div>

                            <div className={styles.modalBody}>
                                <p className={`${styles.modalCategory} ThaiFont`}>
                                    {product.category}
                                </p>
                                <h2
                                    id={`product-title-${product.id}`}
                                    className={`${styles.modalTitle} ThaiFont`}
                                >
                                    {product.name}
                                </h2>
                                <p className={`${styles.modalPrice} ThaiFont`}>
                                    ฿{Number(product.price).toLocaleString()}
                                </p>

                                <div className={styles.modalSection}>
                                    <h3 className={`${styles.modalSectionTitle} ThaiFont`}>
                                        รายละเอียดสินค้า
                                    </h3>
                                    <p className={`${styles.modalDescription} ThaiFont`}>
                                        {product.description?.trim()
                                            ? product.description
                                            : 'ไม่มีรายละเอียดเพิ่มเติม'}
                                    </p>
                                </div>

                                <div className={styles.modalSection}>
                                    <h3 className={`${styles.modalSectionTitle} ThaiFont`}>
                                        ช่องทางการติดต่อซื้อ
                                    </h3>
                                    <div className={`${styles.contactBox} ThaiFont`}>
                                        <p className={styles.contactTitle}>{CONTACT_INFO.title}</p>
                                        <p className={styles.contactLine}>{CONTACT_INFO.office}</p>
                                        <p className={styles.contactLine}>
                                            <MapPin size={14} className={styles.contactIcon} />
                                            {CONTACT_INFO.address}
                                        </p>
                                        <p className={styles.contactLine}>
                                            <Phone size={14} className={styles.contactIcon} />
                                            โทรศัพท์ {CONTACT_INFO.phone}
                                        </p>
                                        <p className={styles.contactLine}>
                                            <Printer size={14} className={styles.contactIcon} />
                                            โทรสาร {CONTACT_INFO.fax}
                                        </p>
                                        <p className={styles.contactLine}>
                                            <Mail size={14} className={styles.contactIcon} />
                                            Email:{' '}
                                            <a href={`mailto:${CONTACT_INFO.email}`}>
                                                {CONTACT_INFO.email}
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
