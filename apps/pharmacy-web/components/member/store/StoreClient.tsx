"use client";

import React, { useState, useMemo } from 'react';
import StoreSearch from './StoreSearch';
import CategoryHighlights from './CategoryHighlights';
import ProductGrid from './ProductGrid';
import { Product } from './ProductCard';
import styles from '@/app/(member)/08_store/store.module.css';

interface StoreClientProps {
    initialProducts: Product[];
}

export default function StoreClient({ initialProducts }: StoreClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");

    const filteredProducts = useMemo(() => {
        let result = initialProducts;

        // Filter by category
        if (selectedCategory !== "ทั้งหมด") {
            result = result.filter((p) => p.category === selectedCategory);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const lower = searchQuery.toLowerCase();
            result = result.filter((p) => p.name.toLowerCase().includes(lower));
        }

        return result;
    }, [initialProducts, selectedCategory, searchQuery]);

    const handleCategorySelect = (name: string) => {
        setSelectedCategory(name);
        // Scroll to product grid
        const el = document.getElementById("store-products");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div className={styles.container}>
            {/* Search */}
            <div className={styles.searchSection}>
                <StoreSearch
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearchSubmit={() => setSearchQuery(searchTerm)}
                />
            </div>

            {/* Category Highlights */}
            <CategoryHighlights onCategorySelect={handleCategorySelect} />

            {/* Product Grid */}
            <div id="store-products">
                <ProductGrid
                    products={filteredProducts}
                />
            </div>
        </div>
    );
}
