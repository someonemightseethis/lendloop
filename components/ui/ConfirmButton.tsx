"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./Button";

/** Destructive actions take two clicks: the first arms the button, the second confirms. */
export function ConfirmButton({ children, confirmLabel = "Click again to confirm", disabled, onConfirm }: {
  children: ReactNode;
  confirmLabel?: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      size="sm"
      variant="danger"
      disabled={disabled}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
