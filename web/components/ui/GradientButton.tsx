import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

export function GradientButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-brand transition-transform active:scale-[0.97] disabled:opacity-50 disabled:shadow-none",
        className,
      )}
      style={{ background: "linear-gradient(135deg, #FF8A3D, #F26A21, #D2551A)" }}
      {...props}
    >
      {children}
    </button>
  );
}
