"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AvailabilityCalendar from "@/components/partner/calendar/AvailabilityCalendar";

export default function PartnerCalendarPage() {
return (
<DashboardLayout
title="Availability Calendar"
profile={{ name: "Partner", role: "partner" }}
> <AvailabilityCalendar /> </DashboardLayout>
);
}
