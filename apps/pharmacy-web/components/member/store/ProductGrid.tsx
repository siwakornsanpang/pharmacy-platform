"use client";

import React from 'react';
import ProductCard, { Product } from './ProductCard';
import { Package } from 'lucide-react';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
    products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
    return (
        <div className={styles.wrapper}>

            {products.length > 0 ? (
                <div className={styles.grid}>
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <Package size={56} className={styles.emptyIcon} />
                    <h3 className="ThaiFont">ไม่พบสินค้าที่ตรงกับการค้นหา</h3>
                    <p className="ThaiFont">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</p>
                </div>
            )}
        </div>
    );
}
