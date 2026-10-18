"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "./list.module.css";

export default function BillListPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            จัดการการเงิน / ธุรกรรม
          </h1>
          <p className={styles.breadcrumb}>
            การเงิน / ธุรกรรม / <span className={styles.breadcrumbActive}>รายการธุรกรรมทั้งหมด</span>
          </p>
        </div>
        <Link href="/backoffice/module/bill" className={styles.backBtn}>
          <ArrowLeft size={16} /> ย้อนกลับ
        </Link>
      </div>
    </div>
  );
}
