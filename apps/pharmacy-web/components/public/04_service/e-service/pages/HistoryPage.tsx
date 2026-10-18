"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, MoreHorizontal, Search } from "lucide-react";
import { EServiceModule } from "../eServiceConfig";
import EServiceShell from "../EServiceShell";
import { MOCK_HISTORY } from "../mockData";
import { FilterModal } from "../modals";
import styles from "../EServiceShell.module.css";

const toneClass = {
  danger: styles.badgeDanger,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  neutral: styles.badgeNeutral,
  action: styles.badgeAction,
} as const;

/**
 * Figma S5: ประวัติ + search/filter + action menus + pagination
 */
export default function HistoryPage({ module }: { module: EServiceModule }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_HISTORY.filter((row) => {
      if (q && !`${row.requestNo} ${row.form}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query]);

  return (
    <>
      <EServiceShell
        module={module}
        activeStep="history"
        showStepper={false}
        breadcrumbs={[
          { label: "หน้าแรก", href: "/home" },
          { label: "งานบริการ", href: "/service" },
          { label: "ประวัติการยื่นคำขอ" },
        ]}
      >
        <div className={styles.historyTop}>
          <h2 className={`${styles.historyTitle} ThaiFont`}>ประวัติการยื่นคำขอ</h2>
          <Link
            href={`/service/e-service/${module.slug}/apply`}
            className={`${styles.btnPrimary} ThaiFont`}
          >
            ยื่นคำขอ
          </Link>
        </div>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <p className={`${styles.muted} ThaiFont`}>พบจำนวน 23 รายการ</p>
            <div className={styles.cardTools}>
              <label className={styles.searchBox}>
                <Search size={16} />
                <input
                  className="ThaiFont"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="ค้นหาหมายเลขคำขอหรือแบบฟอร์ม"
                />
              </label>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="กรอง"
                onClick={() => setShowFilter(true)}
              >
                <Filter size={16} />
              </button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className="ThaiFont">
                  <th>หมายเลขคำขอ</th>
                  <th>วันที่</th>
                  <th>แบบฟอร์มคำขอ</th>
                  <th>สถานะชำระเงิน</th>
                  <th>สถานะดำเนินการ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="ThaiFont">
                    <td>
                      <Link
                        href={`/service/e-service/${row.moduleSlug}/detail`}
                        className={styles.linkBtn}
                      >
                        {row.requestNo}
                      </Link>
                    </td>
                    <td>{row.date}</td>
                    <td>{row.form}</td>
                    <td>
                      {row.paymentTone === "action" ? (
                        <Link
                          href={`/service/e-service/${row.moduleSlug}/payment`}
                          className={`${styles.badge} ${styles.badgeAction}`}
                        >
                          {row.paymentStatus}
                        </Link>
                      ) : (
                        <span className={`${styles.badge} ${toneClass[row.paymentTone]}`}>
                          {row.paymentStatus}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${toneClass[row.processTone]}`}>
                        {row.processStatus}
                      </span>
                    </td>
                    <td>
                      <div className={styles.relative}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label="เมนู"
                          onClick={() =>
                            setOpenMenu((v) => (v === row.id ? null : row.id))
                          }
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {openMenu === row.id && (
                          <div className={`${styles.actionMenu} ThaiFont`}>
                            <button
                              type="button"
                              onClick={() => {
                                window.location.href = `/service/e-service/${row.moduleSlug}/detail`;
                              }}
                            >
                              ดูรายละเอียด
                            </button>
                            {row.paymentTone === "danger" || row.paymentTone === "warning" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  window.location.href = `/service/e-service/${row.moduleSlug}/payment`;
                                }}
                              >
                                ชำระเงิน
                              </button>
                            ) : (
                              <button type="button">พิมพ์ใบเสร็จ</button>
                            )}
                            <button type="button">ยกเลิกคำขอ</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button type="button" className={styles.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ก่อนหน้า
            </button>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.pageBtn} ${page === n ? styles.pageBtnActive : ""}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button type="button" className={styles.pageBtn} onClick={() => setPage((p) => Math.min(5, p + 1))}>
              ถัดไป ›
            </button>
          </div>
        </section>
      </EServiceShell>

      {showFilter && (
        <FilterModal
          onClose={() => setShowFilter(false)}
          onApply={() => setShowFilter(false)}
        />
      )}
    </>
  );
}
