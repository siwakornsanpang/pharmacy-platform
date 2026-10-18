"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, Search } from "lucide-react";
import { EServiceModule } from "../eServiceConfig";
import EServiceShell from "../EServiceShell";
import EsCheckbox from "../EsCheckbox";
import { MOCK_COURSES } from "../mockData";
import { saveSap33Selection } from "../selectionStorage";
import { FilterModal } from "../modals";
import styles from "../EServiceShell.module.css";

/** Figma S1 สภ33: เลือกหลักสูตร */
export default function Sap33ApplyPage({ module }: { module: EServiceModule }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_COURSES;
    return MOCK_COURSES.filter(
      (r) =>
        r.course.toLowerCase().includes(q) ||
        r.branch.toLowerCase().includes(q)
    );
  }, [query]);

  const allVisibleSelected =
    rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const someVisibleSelected = rows.some((r) => selected.includes(r.id));
  const selectAllIndeterminate = someVisibleSelected && !allVisibleSelected;

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(rows.map((r) => r.id));
      setSelected((prev) => prev.filter((id) => !visibleIds.has(id)));
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => next.add(r.id));
      return [...next];
    });
  };

  const goNext = () => {
    if (selected.length === 0) return;
    const courses = MOCK_COURSES.filter((c) => selected.includes(c.id));
    saveSap33Selection({
      ids: selected,
      courses,
      feePerItem: 500,
      total: courses.length * 500,
    });
    router.push(`/service/e-service/${module.slug}/payment`);
  };

  return (
    <>
      <EServiceShell
        module={module}
        activeStep="apply"
        requestNo={module.requestNo}
        breadcrumbs={[
          { label: "หน้าแรก", href: "/home" },
          { label: "งานบริการ", href: "/service" },
          { label: "ประกาศนียบัตร" },
        ]}
        footerMeta={{ title: module.title }}
        footerActions={[
          { label: "บันทึกแบบร่าง", variant: "ghost" },
          {
            label: "ต่อไป",
            onClick: goNext,
            variant: "primary",
            disabled: selected.length === 0,
          },
        ]}
      >
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={`${styles.cardTitle} ThaiFont`}>
              เลือกหลักสูตรที่ต้องการขอประกาศนียบัตรฯ
            </h2>
            <div className={styles.cardTools}>
              <label className={styles.searchBox}>
                <Search size={16} strokeWidth={1.75} />
                <input
                  className="ThaiFont"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาหลักสูตรหรือประกาศนียบัตร"
                />
              </label>
              <button
                type="button"
                className={styles.iconBtn}
                aria-label="กรอง"
                onClick={() => setShowFilter(true)}
              >
                <Filter size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className="ThaiFont">
                  <th style={{ width: 52 }}>
                    <EsCheckbox
                      checked={allVisibleSelected}
                      indeterminate={selectAllIndeterminate}
                      onChange={toggleAllVisible}
                      aria-label="เลือกทั้งหมด"
                    />
                  </th>
                  <th>หลักสูตร</th>
                  <th>ประกาศนียบัตรสาขา</th>
                  <th>รุ่น</th>
                  <th>วันที่อบรม</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="ThaiFont">
                    <td>
                      <EsCheckbox
                        checked={selected.includes(row.id)}
                        onChange={() => toggle(row.id)}
                        aria-label={`เลือก ${row.course}`}
                      />
                    </td>
                    <td className={styles.tableCourse}>{row.course}</td>
                    <td>{row.branch}</td>
                    <td>{row.batch}</td>
                    <td>{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
