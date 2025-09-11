"use client";

import { useForm } from "react-hook-form";
import InputField from "./InputField";
import { Button } from "@/components/ui/Button";

type AuthFormProps = {
  type: "login" | "register";
  onSubmit: (data: any) => void;
};

export default function AuthForm({ type, onSubmit }: AuthFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 p-6 border rounded-lg shadow max-w-md mx-auto"
    >
      <h2 className="text-2xl font-bold text-center">
        {type === "login" ? "Login" : "Register"}
      </h2>

      <InputField
        label="Email"
        name="email"
        type="email"
        register={register}
        error={errors.email}
        placeholder="you@example.com"
      />

      <InputField
        label="Password"
        name="password"
        type="password"
        register={register}
        error={errors.password}
        placeholder="••••••••"
      />

      {type === "register" && (
        <InputField
          label="Full Name"
          name="name"
          register={register}
          error={errors.name}
          placeholder="John Doe"
        />
      )}

      <Button type="submit" className="w-full">
        {type === "login" ? "Login" : "Register"}
      </Button>
    </form>
  );
}
