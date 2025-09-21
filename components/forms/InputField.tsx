import { FieldError, FieldErrorsImpl, Merge } from "react-hook-form";

type InputFieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  register: any;
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined;
};

export default function InputField({
  label,
  name,
  type = "text",
  placeholder,
  register,
  error,
}: InputFieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-full"
      />
      {error && (
        <span className="text-red-500 text-sm">
          {typeof error?.message === "string" ? error.message : "Invalid input"}
        </span>
      )}
    </div>
  );
}
