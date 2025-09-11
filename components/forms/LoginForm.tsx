"use client";

import { useForm } from "react-hook-form";
import InputField from "./InputField";
import { Button } from "@/components/ui/Button";

type LoginFormProps = {
  onSubmit: (data: any) => void;
};

export default function LoginForm({ onSubmit }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 p-6 border rounded-lg shadow max-w-md mx-auto"
    >
      <h2 className="text-2xl font-bold text-center">🔑 Login</h2>

      <InputField
        label="Email"
        name="email"
        type="email"
        register={register}
        error={errors.email}
        placeholder="your@email.com"
      />

      <InputField
        label="Password"
        name="password"
        type="password"
        register={register}
        error={errors.password}
        placeholder="••••••••"
      />

      <div className="text-right">
        <a
          href="/auth/forgot-password"
          className="text-blue-600 text-sm hover:underline"
        >
          Forgot Password?
        </a>
      </div>

      <Button type="submit" className="w-full">
        Login
      </Button>

      <p className="text-sm text-center mt-4">
        Don’t have an account?{" "}
        <a
          href="/auth/register"
          className="text-blue-600 font-medium hover:underline"
        >
          Register
        </a>
      </p>
    </form>
  );
}
