"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "./list.module.css";

export default function RoyalCollegeListPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            จัดการราชวิทยาลัย
          </h1>
          <p className={styles.breadcrumb}>
            ราชวิทยาลัย / <span className={styles.breadcrumbActive}>จัดการราชวิทยาลัย</span>
          </p>
        </div>
        <Link href="/backoffice/module/royalcollege" className={styles.backBtn}>
          <ArrowLeft size={16} /> ย้อนกลับ
        </Link>
      </div>
    </div>
  );
}
