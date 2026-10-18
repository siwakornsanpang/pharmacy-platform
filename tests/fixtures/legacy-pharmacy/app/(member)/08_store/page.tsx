import React from 'react';
import { getProducts } from '@/lib/api';
import StoreClient from '@/components/member/store/StoreClient';
import StoreBanner from '@/components/member/store/StoreBanner';
import styles from './store.module.css';

export const dynamic = 'force-dynamic';

export default async function StorePage() {
    const products = await getProducts();

    return (
        <div className={styles.page}>
            <StoreBanner />
            <StoreClient initialProducts={products} />
        </div>
    );
}
