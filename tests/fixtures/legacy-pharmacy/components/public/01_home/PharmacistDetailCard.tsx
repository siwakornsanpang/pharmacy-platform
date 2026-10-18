"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Award,
  Building2,
  MapPin,
  Info,
  User,
  ChevronDown,
} from "lucide-react";
import styles from "./LicenseSearch.module.css";
import {
  PharmacistData,
  getFormattedThaiDateTime,
} from "./licenseSearchShared";

function getLicenseStatusDisplay(item: PharmacistData) {
  if (item.statusType === "abnormal") {
    return {
      label: item.statusReason
        ? `ไม่ปกติ — ${item.statusReason}`
        : "ไม่ปกติ",
      className: styles.statusSuspended,
      iconClassName: styles.statusIconSuspended,
      Icon: AlertTriangle,
    };
  }
  return {
    label: "ปกติ",
    className: styles.statusNormal,
    iconClassName: styles.statusIcon,
    Icon: CheckCircle2,
  };
}

function getCpeStatusDisplay(item: PharmacistData) {
  if (item.cpeStatus === "incomplete") {
    return {
      label: "ไม่ครบตามเกณฑ์",
      className: styles.statusCpe,
      iconClassName: styles.statusIconCpe,
      Icon: AlertTriangle,
    };
  }
  return {
    label: "ครบตามเกณฑ์",
    className: styles.statusNormal,
    iconClassName: styles.statusIcon,
    Icon: CheckCircle2,
  };
}

export default function PharmacistDetailCard({
  item,
  searchTime = getFormattedThaiDateTime(),
}: {
  item: PharmacistData;
  searchTime?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const [certsExpanded, setCertsExpanded] = useState(false);
  const licenseStatus = getLicenseStatusDisplay(item);
  const cpeStatus = getCpeStatusDisplay(item);
  const LicenseIcon = licenseStatus.Icon;
  const CpeIcon = cpeStatus.Icon;

  const allCerts = item.certificates || [];
  const visibleCerts = certsExpanded ? allCerts : allCerts.slice(0, 3);
  const hiddenCount = Math.max(0, allCerts.length - 3);

  return (
    <div className={styles.resultItemBlock}>
      <div className={styles.profileCard}>
        <div className={styles.avatarWrapper}>
          {item.image && !imageError ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="140px"
              className={styles.avatarImage}
              unoptimized
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <User size={56} className={styles.avatarPlaceholderIcon} />
            </div>
          )}
        </div>

        <div className={styles.profileDetails}>
          <h4 className={styles.pharmacistName}>
            {item.title ? `${item.title} ` : ""}
            {item.name}
          </h4>

          <div className={styles.detailRows}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>เลขที่ใบอนุญาต</span>
              <span className={styles.detailValue}>{item.licenseNo}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>สถานะใบอนุญาตประกอบวิชาชีพ</span>
              <span className={`${styles.detailValue} ${licenseStatus.className}`}>
                <LicenseIcon size={16} className={licenseStatus.iconClassName} />
                {licenseStatus.label}
              </span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>สถานะการศึกษา</span>
              <span className={`${styles.detailValue} ${cpeStatus.className}`}>
                <CpeIcon size={16} className={cpeStatus.iconClassName} />
                {cpeStatus.label}
              </span>
            </div>

            {item.expiryDate && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>ใบอนุญาตหมดอายุ</span>
                <span className={styles.detailValue}>{item.expiryDate}</span>
              </div>
            )}

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                ใบอนุญาตเป็นผู้ประกอบวิชาชีพเภสัชกรรม
              </span>
              <span className={styles.detailValueMuted}>
                {item.replacementInfo || "(ไม่เคยขอใบแทน)"}
              </span>
            </div>

            <div className={styles.detailRowStacked}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>ที่อยู่ที่ติดต่อได้</span>
                <span className={styles.detailValue}>
                  <MapPin size={15} className={styles.infoIcon} />
                  {item.contactProvince || "-"}
                </span>
              </div>
              <div className={styles.timestampUnderField}>
                <Info size={14} className={styles.infoIcon} />
                <span>ข้อมูล ณ วันที่ค้นหา {searchTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.qualificationCard}>
        <div className={styles.qualHeaderRow}>
          <div className={styles.qualHeader}>
            <GraduationCap size={20} className={styles.qualIcon} />
            <span>คุณวุฒิและการอบรม</span>
          </div>
          {allCerts.length > 0 && (
            <span className={styles.qualCount}>
              แสดง {visibleCerts.length} จาก {allCerts.length} รายการ
            </span>
          )}
        </div>

        <div className={styles.certTableWrap}>
          <div className={styles.certTableHead} aria-hidden="true">
            <span>ชื่อประกาศนียบัตร</span>
            <span>วันที่จัด</span>
            <span>หน่วยงานที่จัด</span>
          </div>

          {visibleCerts.length > 0 ? (
            <ul className={styles.certTableBody}>
              {visibleCerts.map((cert, certIdx) => (
                <li key={`${cert.name}-${cert.date}-${certIdx}`} className={styles.certRow}>
                  <div className={styles.certCellName}>
                    <Award size={16} className={styles.certIcon} />
                    <span>{cert.name || "-"}</span>
                  </div>
                  <div className={styles.certCellDate} data-label="วันที่จัด">
                    {cert.date || "-"}
                  </div>
                  <div className={styles.certCellOrg} data-label="หน่วยงานที่จัด">
                    <Building2 size={14} className={styles.certOrgIcon} />
                    <span>{cert.organization || "-"}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.certEmpty}>ยังไม่มีข้อมูลคุณวุฒิและการอบรม</div>
          )}
        </div>

        {hiddenCount > 0 && (
          <button
            type="button"
            className={styles.certExpandBtn}
            onClick={() => setCertsExpanded((v) => !v)}
            aria-expanded={certsExpanded}
          >
            <ChevronDown
              size={16}
              className={`${styles.certExpandIcon} ${
                certsExpanded ? styles.certExpandIconOpen : ""
              }`}
            />
            {certsExpanded
              ? "ย่อรายการ"
              : `ดูทั้งหมดอีก ${hiddenCount} รายการ`}
          </button>
        )}
      </div>
    </div>
  );
}
