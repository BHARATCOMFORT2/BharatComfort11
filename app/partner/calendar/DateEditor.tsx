"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/Button";

export default function DateEditor({ day, close, reload }: any) {

const [price, setPrice] = useState(day.price || 0);
const [rooms, setRooms] = useState(day.rooms || 1);
const [blocked, setBlocked] = useState(day.blocked || false);

async function save() {

```
const res = await apiFetch("/api/partners/calendar/update", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    date: day.date,
    price,
    rooms,
    blocked,
  }),
});

const j = await res.json();

if (j.success) {
  reload();
  close();
} else {
  alert(j.error);
}
```

}

return ( <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

```
  <div className="bg-white p-6 rounded-xl w-80 space-y-4">

    <h3 className="font-semibold">
      Manage {day.date}
    </h3>

    <input
      type="number"
      value={price}
      onChange={(e) => setPrice(Number(e.target.value))}
      className="border p-2 w-full"
      placeholder="Price"
    />

    <input
      type="number"
      value={rooms}
      onChange={(e) => setRooms(Number(e.target.value))}
      className="border p-2 w-full"
      placeholder="Rooms"
    />

    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={blocked}
        onChange={(e) => setBlocked(e.target.checked)}
      />
      Block Date
    </label>

    <div className="flex gap-2">

      <Button onClick={save}>
        Save
      </Button>

      <Button onClick={close}>
        Cancel
      </Button>

    </div>

  </div>

</div>
```

);
}
