"use client";

import { forwardRef, useEffect, useRef } from "react";
import { Check, Minus } from "lucide-react";
import styles from "./EServiceShell.module.css";

type Props = {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  "aria-label": string;
};

/** Custom checkbox matching Figma olive check boxes */
const EsCheckbox = forwardRef<HTMLInputElement, Props>(function EsCheckbox(
  { checked, indeterminate = false, onChange, "aria-label": ariaLabel },
  forwardedRef
) {
  const localRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = localRef.current;
    if (el) el.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className={styles.checkWrap}>
      <input
        ref={(node) => {
          localRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        type="checkbox"
        className={styles.checkInput}
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
      />
      <span
        className={`${styles.checkFace} ${
          checked || indeterminate ? styles.checkFaceOn : ""
        }`}
        aria-hidden
      >
        {indeterminate ? (
          <Minus size={12} strokeWidth={3} color="#fff" />
        ) : checked ? (
          <Check size={13} strokeWidth={3} color="#fff" />
        ) : null}
      </span>
    </label>
  );
});

export default EsCheckbox;
