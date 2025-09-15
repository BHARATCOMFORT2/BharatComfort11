"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plane, Train, Bus, Phone } from "lucide-react";

export default function QuickActionStrip() {
  const actions = [
    {
      label: "Flights",
      icon: Plane,
      href: "/listings?category=flights",
    },
    {
      label: "Trains",
      icon: Train,
      href: "/listings?category=trains",
    },
    {
      label: "Buses",
      icon: Bus,
      href: "/listings?category=buses",
    },
    {
      label: "Support",
      icon: Phone,
      href: "/support",
    },
  ];

  return (
    <div className="w-full flex justify-center px-4 my-8">
      <Card className="flex w-full max-w-4xl justify-around p-4 shadow-md rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            className="flex flex-col items-center space-y-1 hover:bg-white"
            onClick={() => (window.location.href = action.href)}
          >
            <action.icon className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-medium">{action.label}</span>
          </Button>
        ))}
      </Card>
    </div>
  );
}
