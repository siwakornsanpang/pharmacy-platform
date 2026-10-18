"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "./list.module.css";

export default function EServiceListPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            จัดการ E-Service
          </h1>
          <p className={styles.breadcrumb}>
            E-Service / <span className={styles.breadcrumbActive}>รายการบริการออนไลน์</span>
          </p>
        </div>
        <Link href="/backoffice/module/e-service" className={styles.backBtn}>
          <ArrowLeft size={16} /> ย้อนกลับ
        </Link>
      </div>
    </div>
  );
}
