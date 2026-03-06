"use client";

import { useState } from "react";

type Props = {
listingId: string;
};

export default function AvailabilityCalendar({ listingId }: Props) {
const [blockedDates, setBlockedDates] = useState<string[]>([]);

const toggleDate = (date: string) => {
setBlockedDates((prev) =>
prev.includes(date)
? prev.filter((d) => d !== date)
: [...prev, date]
);
};

const today = new Date();
const days = Array.from({ length: 30 }).map((_, i) => {
const d = new Date();
d.setDate(today.getDate() + i);
return d.toISOString().slice(0, 10);
});

return ( <div className="bg-white rounded-xl shadow p-6"> <h3 className="text-lg font-semibold mb-4">
Availability Calendar </h3>

```
  <div className="grid grid-cols-5 gap-3">
    {days.map((d) => (
      <button
        key={d}
        onClick={() => toggleDate(d)}
        className={`p-2 rounded text-sm border ${
          blockedDates.includes(d)
            ? "bg-red-500 text-white"
            : "bg-green-100"
        }`}
      >
        {d.slice(8)}
      </button>
    ))}
  </div>

  <p className="text-sm text-gray-500 mt-4">
    Red = Blocked | Green = Available
  </p>
</div>
```

);
}
