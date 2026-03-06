"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import DayCell from "./DayCell";

export default function AvailabilityCalendar() {

const [days, setDays] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
loadCalendar();
}, []);

async function loadCalendar() {

```
try {

  const res = await apiFetch("/api/partners/calendar");

  const j = await res.json();

  if (j.ok) setDays(j.days || []);

} catch (err) {
  console.error(err);
}

setLoading(false);
```

}

if (loading) return <p>Loading calendar...</p>;

return ( <div className="grid grid-cols-7 gap-2">

```
  {days.map((d) => (
    <DayCell key={d.date} day={d} reload={loadCalendar} />
  ))}

</div>
```

);
}
