// components/forms/FormError.tsx
import { FieldError, FieldErrorsImpl, Merge } from "react-hook-form";

type FormErrorProps = {
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>>;
};

export default function FormError({ error }: FormErrorProps) {
  if (!error) return null;

  return (
    <span className="text-red-500 text-sm">
      {typeof error.message === "string" ? error.message : "Invalid input"}
    </span>
  );
}
