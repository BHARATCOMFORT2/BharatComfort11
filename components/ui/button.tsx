"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline";
}

export default function Button({
  children,
  className,
  loading,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-2xl font-medium flex items-center justify-center gap-2 transition",
        variant === "primary" &&
          "bg-blue-600 text-white hover:bg-blue-700 shadow-md",
        variant === "secondary" &&
          "bg-gray-200 text-gray-900 hover:bg-gray-300",
        variant === "outline" &&
          "border border-gray-400 text-gray-700 hover:bg-gray-100",
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
