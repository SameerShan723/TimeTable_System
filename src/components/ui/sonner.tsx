"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        style: {
          background: "var(--normal-bg, black)",
          color: "var(--normal-text, white)",
          border: "1px solid var(--normal-border, #333)",
          borderRadius: "8px",
          padding: "16px",
          fontSize: "14px",
        },
        className: "toaster-toast",
        classNames: {
          toast: "toaster-toast",
          error: "toaster-error",
          success: "toaster-success",
          warning: "toaster-warning",
        },
      }}
      style={
        {
          "--normal-bg": "black",
          "--normal-text": "white",
          "--normal-border": "#333",
          "--error-bg": "#f44336",
          "--error-text": "#ffffff",
          "--error-border": "#d32f2f",
          "--success-bg": "#4caf50",
          "--success-text": "#ffffff",
          "--success-border": "#388e3c",
          "--warning-bg": "#ff9800",
          "--warning-text": "#ffffff",
          "--warning-border": "#f57c00",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
