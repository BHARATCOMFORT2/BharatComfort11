"use client";

import { backgrounds } from "config/backgrounds";

export default function SectionBackground({
  section,
  children,
}: {
  section: keyof typeof backgrounds.sections;
  children: React.ReactNode;
}) {
  const bg = backgrounds.sections[section];

  return (
    <section
      className="relative py-16 bg-cover bg-center"
      style={{ backgroundImage: `url(${bg?.image || ""})` }}
    >
      <div className={`absolute inset-0 ${bg?.overlay || ""}`} />
      <div className="relative z-10 max-w-6xl mx-auto px-6">{children}</div>
    </section>
  );
}
