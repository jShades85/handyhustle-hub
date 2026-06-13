import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      className="toaster group"
      style={{
        "--normal-bg": "var(--elevated)",
        "--normal-border": "var(--hairline)",
        "--normal-text": "var(--foreground)",
        "--error-bg": "oklch(0.22 0.04 25)",
        "--error-border": "oklch(0.55 0.18 25 / 0.4)",
        "--error-text": "oklch(0.82 0.1 25)",
        "--success-bg": "oklch(0.22 0.04 145)",
        "--success-border": "oklch(0.55 0.15 145 / 0.4)",
        "--success-text": "oklch(0.82 0.1 145)",
      } as React.CSSProperties}
      toastOptions={{
        classNames: {
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
