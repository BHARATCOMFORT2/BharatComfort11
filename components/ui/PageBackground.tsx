"use client";

import { backgrounds } from "config/backgrounds";
import { usePathname } from "next/navigation";

export default function PageBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pageKey = pathname === "/" ? "home" : pathname.split("/")[1];
  const bg = backgrounds.pages[pageKey as keyof typeof backgrounds.pages];

  return (
    <div
      className="relative min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${bg?.image || ""})` }}
    >
      <div className={`absolute inset-0 ${bg?.overlay || "bg-black/40"}`} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
