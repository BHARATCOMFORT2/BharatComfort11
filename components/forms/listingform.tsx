"use client";

import { useForm } from "react-hook-form";
import InputField from "./InputField";
import TextAreaField from "./TextAreaField";
import SelectField from "./SelectField";
import { Button } from "@/components/ui/Button";

type ListingFormProps = {
  onSubmit: (data: any) => void;
  initialValues?: any;
};

export default function ListingForm({ onSubmit, initialValues }: ListingFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: initialValues || {
      title: "",
      category: "",
      location: "",
      price: "",
      description: "",
      image: "",
    },
  });

  const categories = [
    { value: "hotel", label: "Hotel" },
    { value: "restaurant", label: "Restaurant" },
    { value: "travel", label: "Travel Experience" },
  ];

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 p-6 border rounded-lg shadow max-w-2xl mx-auto"
    >
      <h2 className="text-2xl font-bold text-center">🏨 Manage Listing</h2>

      <InputField
        label="Title"
        name="title"
        register={register}
        error={errors.title}
        placeholder="E.g. Taj Hotel Mumbai"
      />

      <SelectField
        label="Category"
        name="category"
        register={register}
        options={categories}
      />

      <InputField
        label="Location"
        name="location"
        register={register}
        error={errors.location}
        placeholder="E.g. Mumbai, India"
      />

      <InputField
        label="Price (optional)"
        name="price"
        register={register}
        error={errors.price}
        placeholder="E.g. ₹5000/night"
      />

      <TextAreaField
        label="Description"
        name="description"
        register={register}
        placeholder="Enter details about this listing..."
      />

      <InputField
        label="Image URL"
        name="image"
        register={register}
        error={errors.image}
        placeholder="https://example.com/image.jpg"
      />

      <Button type="submit" className="w-full">
        Save Listing
      </Button>
    </form>
  );
}
