"use client";

import { useForm } from "react-hook-form";
import InputField from "./InputField";
import { Button } from "@/components/ui/Button";

type RegisterFormProps = {
  onSubmit: (data: any) => void;
};

export default function RegisterForm({ onSubmit }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      accountType: "user",
    },
  });

  const password = watch("password");

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 p-6 border rounded-lg shadow max-w-md mx-auto"
    >
      <h2 className="text-2xl font-bold text-center">📝 Register</h2>

      <InputField
        label="Full Name"
        name="name"
        register={register}
        error={errors.name}
        placeholder="John Doe"
      />

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

      <InputField
        label="Confirm Password"
        name="confirmPassword"
        type="password"
        register={register({
          validate: (value: string) =>
            value === password || "Passwords do not match",
        })}
        error={errors.confirmPassword}
        placeholder="••••••••"
      />

      <div className="flex flex-col">
        <label className="mb-2 font-medium">Account Type</label>
        <select
          {...register("accountType", { required: true })}
          className="border rounded-lg p-2"
        >
          <option value="user">User</option>
          <option value="partner">Partner</option>
        </select>
      </div>

      <Button type="submit" className="w-full">
        Create Account
      </Button>

      <p className="text-sm text-center mt-4">
        Already have an account?{" "}
        <a href="/auth/login" className="text-blue-600 font-medium hover:underline">
          Login
        </a>
      </p>
    </form>
  );
}
