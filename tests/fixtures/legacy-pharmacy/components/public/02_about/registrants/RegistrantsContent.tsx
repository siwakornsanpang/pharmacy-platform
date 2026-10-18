import styles from "./RegistrantsContent.module.css";
import {
  REGISTRANT_NOTES,
  REGISTRANT_ROWS,
  formatCount,
  sumColumn,
  type RegistrantRow,
} from "./registrantData";

const COLUMNS: {
  key: keyof Pick<
    RegistrantRow,
    "diploma" | "approval" | "professionalCert" | "certificate"
  >;
  label: string;
}[] = [
  { key: "diploma", label: "วุฒิบัตร" },
  { key: "approval", label: "หนังสืออนุมัติ" },
  { key: "professionalCert", label: "ประกาศนียบัตรวิชาชีพ" },
  { key: "certificate", label: "ประกาศนียบัตร" },
];

export default function RegistrantsContent() {
  const totals = {
    diploma: sumColumn(REGISTRANT_ROWS, "diploma"),
    approval: sumColumn(REGISTRANT_ROWS, "approval"),
    professionalCert: sumColumn(REGISTRANT_ROWS, "professionalCert"),
    certificate: sumColumn(REGISTRANT_ROWS, "certificate"),
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.intro}>
        <p className={`${styles.introTitle} ThaiFont`}>
          ผู้ประกอบวิชาชีพเภสัชกรรมที่ได้รับคุณวุฒิสาขาความเชี่ยวชาญจากหลักสูตรที่สภาเภสัชกรรมให้การรับรอง
        </p>
        <p className={`${styles.introSubtitle} ThaiFont`}>
          จำแนกตามคุณวุฒิสาขาความเชี่ยวชาญในการประกอบวิชาชีพเภสัชกรรม
        </p>
      </div>

      <div className={styles.summary}>
        <p className={`${styles.summaryTitle} ThaiFont`}>จำนวนรวมทั้งสิ้น</p>
        <div className={styles.summaryGrid}>
          {COLUMNS.map((column) => (
            <div key={column.key} className={styles.summaryCell}>
              <span className={styles.summaryNumber}>
                {formatCount(totals[column.key])}
              </span>
              <span className={`${styles.summaryLabel} ThaiFont`}>
                {column.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.cards}>
        {REGISTRANT_ROWS.map((row) => (
          <article key={row.id} className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardIndex}>{row.id}</span>
              <h3 className={`${styles.cardTitle} ThaiFont`}>{row.specialty}</h3>
            </div>
            <div className={styles.chipRow}>
              {COLUMNS.map((column) => {
                const value = row[column.key];
                const empty = value == null;
                return (
                  <div
                    key={column.key}
                    className={empty ? styles.chipEmpty : styles.chip}
                  >
                    <span className={styles.chipNumber}>{formatCount(value)}</span>
                    <span className={`${styles.chipLabel} ThaiFont`}>
                      {column.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colIndex}>ลำดับ</th>
              <th className={styles.colSpecialty}>สาขาความเชี่ยวชาญ</th>
              <th>วุฒิบัตร</th>
              <th>หนังสืออนุมัติ</th>
              <th>ประกาศนียบัตรวิชาชีพเภสัชกรรม</th>
              <th>ประกาศนียบัตร</th>
            </tr>
          </thead>
          <tbody>
            {REGISTRANT_ROWS.map((row) => (
              <tr key={row.id}>
                <td className={styles.colIndex}>{row.id}</td>
                <td className={styles.colSpecialty}>{row.specialty}</td>
                <td>{formatCount(row.diploma)}</td>
                <td>{formatCount(row.approval)}</td>
                <td>{formatCount(row.professionalCert)}</td>
                <td>{formatCount(row.certificate)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className={styles.totalLabel}>
                จำนวนรวมทั้งสิ้น
              </td>
              <td>{formatCount(totals.diploma)}</td>
              <td>{formatCount(totals.approval)}</td>
              <td>{formatCount(totals.professionalCert)}</td>
              <td>{formatCount(totals.certificate)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={styles.notes}>
        <p className={`${styles.notesTitle} ThaiFont`}>หมายเหตุ</p>
        <ol className={styles.notesList}>
          {REGISTRANT_NOTES.map((note, index) => (
            <li key={index} className="ThaiFont">
              {note}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
