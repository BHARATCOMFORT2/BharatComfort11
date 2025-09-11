"use client";

import { useForm } from "react-hook-form";
import InputField from "./InputField";
import { Button } from "@/components/ui/Button";

type RoleFormProps = {
  onSubmit: (data: any) => void;
  initialValues?: any;
};

export default function RoleForm({ onSubmit, initialValues }: RoleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: initialValues || {
      roleName: "",
      description: "",
      permissions: "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 p-6 border rounded-lg shadow max-w-lg mx-auto"
    >
      <h2 className="text-2xl font-bold text-center">🛡️ Role Management</h2>

      <InputField
        label="Role Name"
        name="roleName"
        register={register}
        error={errors.roleName}
        placeholder="e.g. Moderator, Partner Manager"
      />

      <InputField
        label="Description"
        name="description"
        register={register}
        error={errors.description}
        placeholder="Short description of role"
      />

      <InputField
        label="Permissions"
        name="permissions"
        register={register}
        error={errors.permissions}
        placeholder="comma-separated (e.g. create, edit, delete, view)"
      />

      <Button type="submit" className="w-full">
        Save Role
      </Button>
    </form>
  );
}
