"use client";

import { useForm } from "react-hook-form";
import InputField from "./InputField";
import { Button } from "@/components/ui/Button";

type StaffFormProps = {
  onSubmit: (data: any) => void;
  initialValues?: any;
  roles?: string[]; // available roles passed down
};

export default function StaffForm({
  onSubmit,
  initialValues,
  roles = [],
}: StaffFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: initialValues || {
      name: "",
      email: "",
      role: "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 p-6 border rounded-lg shadow max-w-lg mx-auto"
    >
      <h2 className="text-2xl font-bold text-center">👥 Staff Management</h2>

      <InputField
        label="Full Name"
        name="name"
        register={register}
        error={errors.name}
        placeholder="Enter staff name"
      />

      <InputField
        label="Email"
        name="email"
        register={register}
        error={errors.email}
        placeholder="staff@example.com"
      />

      <div className="flex flex-col">
        <label className="mb-2 font-medium">Assign Role</label>
        <select
          {...register("role", { required: "Role is required" })}
          className="border rounded-lg p-2"
        >
          <option value="">Select a role</option>
          {roles.map((role, idx) => (
            <option key={idx} value={role}>
              {role}
            </option>
          ))}
        </select>
       {errors.role && (
  <span className="text-red-500 text-sm">
    {typeof errors.role?.message === "string" ? errors.role.message : "Invalid role"}
  </span>
)}
      </div>

      <Button type="submit" className="w-full">
        Save Staff
      </Button>
    </form>
  );
}
