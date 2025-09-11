"use client";

import { FieldError } from "react-hook-form";

type InputFieldProps = {
  label: string;
  type?: string;
  name: string;
  register?: any;
  error?: FieldError;
  placeholder?: string;
};

export default function InputField({
  label,
  type = "text",
  name,
  register,
  error,
  placeholder,
}: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="font-medium text-sm">
        {label}
      </label>
      <input
        id={name}
        type={type}
        {...(register ? register(name) : {})}
        placeholder={placeholder}
        className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
      />
      {error && <span className="text-red-500 text-sm">{error.message}</span>}
    </div>
  );
}
