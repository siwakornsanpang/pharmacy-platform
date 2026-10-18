"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import {
  EServiceModule,
  EServiceStepId,
  WIZARD_STEPS,
  getWizardIndex,
} from "./eServiceConfig";
import styles from "./EServiceShell.module.css";

type FooterAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline";
  disabled?: boolean;
};

type Props = {
  module: EServiceModule;
  activeStep?: EServiceStepId;
  requestNo?: string;
  breadcrumbs?: { label: string; href?: string }[];
  showStepper?: boolean;
  footerMeta?: { title: string; subtitle?: string };
  footerActions?: FooterAction[];
  children: React.ReactNode;
};

export default function EServiceShell({
  module,
  activeStep,
  requestNo,
  breadcrumbs,
  showStepper = true,
  footerMeta,
  footerActions,
  children,
}: Props) {
  const crumbs = breadcrumbs ?? [
    { label: "หน้าแรก", href: "/home" },
    { label: "งานบริการ", href: "/service" },
    { label: module.shortTitle },
  ];
  const wizardIndex = getWizardIndex(activeStep);

  return (
    <div className={styles.page}>
      <nav className={`${styles.breadcrumb} ThaiFont`} aria-label="breadcrumb">
        {crumbs.map((crumb, i) => (
          <span key={`${crumb.label}-${i}`} style={{ display: "contents" }}>
            {i > 0 && <span className={styles.crumbSep}>›</span>}
            {crumb.href ? (
              <Link href={crumb.href}>{crumb.label}</Link>
            ) : (
              <span className={styles.crumbActive}>{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <header className={styles.titleBand}>
        <div className={styles.titleInner}>
          <h1 className={`${styles.title} ThaiFont`}>{module.title}</h1>
          {requestNo && (
            <div className={`${styles.requestNo} ThaiFont`}>
              หมายเลขคำขอ {requestNo}
            </div>
          )}
        </div>
      </header>

      <div className={styles.body}>
        {showStepper && wizardIndex > 0 && (
          <div className={styles.stepper} aria-label="ขั้นตอนคำขอ">
            {WIZARD_STEPS.map((step, index) => {
              const n = index + 1;
              const done = wizardIndex > n;
              const active = wizardIndex === n;
              const href =
                module.steps.find((s) => s.wizardIndex === n)?.hrefSuffix ||
                `/service/e-service/${module.slug}/${step.id}`;
              return (
                <div key={step.id} className={styles.stepItem}>
                  <Link href={href} className={styles.stepNode}>
                    <span
                      className={`${styles.stepCircle} ${
                        done
                          ? styles.stepCircleDone
                          : active
                            ? styles.stepCircleActive
                            : ""
                      }`}
                    >
                  {done ? (
                        <Check size={16} strokeWidth={3} />
                      ) : active ? (
                        String(n)
                      ) : (
                        String(n).padStart(2, "0")
                      )}
                    </span>
                    <span
                      className={`${styles.stepLabel} ThaiFont ${
                        active ? styles.stepLabelActive : ""
                      }`}
                    >
                      {step.label}
                    </span>
                  </Link>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div
                      className={`${styles.stepLine} ${
                        wizardIndex > n ? styles.stepLineDone : ""
                      }`}
                      aria-hidden
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {children}
      </div>

      {(footerMeta || footerActions) && (
        <div className={styles.footerBar}>
          <div className={styles.footerInner}>
            <div className={`${styles.footerMeta} ThaiFont`}>
              {footerMeta && (
                <>
                  <strong>{footerMeta.title}</strong>
                  {footerMeta.subtitle && <span>{footerMeta.subtitle}</span>}
                </>
              )}
            </div>
            <div className={styles.footerActions}>
              {footerActions?.map((action) => {
                const cls =
                  action.variant === "primary"
                    ? styles.btnPrimary
                    : action.variant === "outline"
                      ? styles.btnOutline
                      : styles.btnGhost;
                if (action.href && !action.disabled) {
                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      className={`${cls} ThaiFont`}
                    >
                      {action.label}
                    </Link>
                  );
                }
                return (
                  <button
                    key={action.label}
                    type="button"
                    className={`${cls} ThaiFont`}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    aria-disabled={action.disabled || undefined}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
