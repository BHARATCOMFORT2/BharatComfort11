"use client";

type TextAreaFieldProps = {
  label: string;
  name: string;
  register?: any;
  placeholder?: string;
};

export default function TextAreaField({
  label,
  name,
  register,
  placeholder,
}: TextAreaFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="font-medium text-sm">
        {label}
      </label>
      <textarea
        id={name}
        {...(register ? register(name) : {})}
        placeholder={placeholder}
        rows={4}
        className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
      />
    </div>
  );
}
