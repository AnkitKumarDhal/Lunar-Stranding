import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

type PanelTone = "default" | "raised" | "inset";
type ButtonVariant = "primary" | "secondary" | "warning" | "danger";
type ButtonSize = "sm" | "md" | "lg";
type BadgeTone = "accent" | "warning" | "success" | "danger" | "muted";

interface UiPanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: PanelTone;
}

interface UiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

interface UiBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

function joinClasses(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function UiPanel({
  tone = "default",
  className,
  ...props
}: UiPanelProps) {
  return (
    <div
      className={joinClasses("ui-panel", `ui-panel--${tone}`, className)}
      {...props}
    />
  );
}

export function UiButton({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...props
}: UiButtonProps) {
  return (
    <button
      type={type}
      className={joinClasses(
        "ui-button",
        `ui-button--${variant}`,
        `ui-button--${size}`,
        className,
      )}
      {...props}
    />
  );
}

export function UiBadge({ tone = "muted", className, ...props }: UiBadgeProps) {
  return (
    <span
      className={joinClasses("ui-badge", `ui-badge--${tone}`, className)}
      {...props}
    />
  );
}

export function UiDivider({ className }: { className?: string }) {
  return (
    <div role="separator" className={joinClasses("ui-divider", className)} />
  );
}
