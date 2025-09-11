"use client";

import { useForm } from "react-hook-form";
import InputField from "./InputField";
import { Button } from "@/components/ui/Button";

type ProfileFormProps = {
  onSubmit: (data: any) => void;
  initialValues?: any;
};

export default function ProfileForm({ onSubmit, initialValues }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: initialValues || {
      name: "",
      email: "",
      password: "",
      avatar: "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 p-6 border rounded-lg shadow max-w-lg mx-auto"
    >
      <h2 className="text-2xl font-bold text-center">👤 Profile Settings</h2>

      <InputField
        label="Full Name"
        name="name"
        register={register}
        error={errors.name}
        placeholder="John Doe"
      />

      <InputField
        label="Email"
        type="email"
        name="email"
        register={register}
        error={errors.email}
        placeholder="you@example.com"
      />

      <InputField
        label="New Password"
        type="password"
        name="password"
        register={register}
        error={errors.password}
        placeholder="••••••••"
      />

      <InputField
        label="Avatar URL"
        name="avatar"
        register={register}
        error={errors.avatar}
        placeholder="https://example.com/avatar.jpg"
      />

      <Button type="submit" className="w-full">
        Save Changes
      </Button>
    </form>
  );
}
