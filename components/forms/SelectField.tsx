"use client";

type SelectFieldProps = {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  register?: any;
};

export default function SelectField({
  label,
  name,
  options,
  register,
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="font-medium text-sm">
        {label}
      </label>
      <select
        id={name}
        {...(register ? register(name) : {})}
        className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
