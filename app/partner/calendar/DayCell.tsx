"use client";

import { useState } from "react";
import DateEditor from "./DateEditor";

export default function DayCell({ day, reload }: any) {

const [open, setOpen] = useState(false);

return (
<>
<div
className={`border rounded p-3 text-sm cursor-pointer
          ${day.blocked ? "bg-red-100" : "bg-white"}
        `}
onClick={() => setOpen(true)}
> <div className="font-semibold">{day.day}</div>

```
    <div className="text-xs text-gray-500">
      ₹{day.price}
    </div>

    {day.blocked && (
      <div className="text-xs text-red-500">
        Blocked
      </div>
    )}
  </div>

  {open && (
    <DateEditor
      day={day}
      close={() => setOpen(false)}
      reload={reload}
    />
  )}
</>
```

);
}
