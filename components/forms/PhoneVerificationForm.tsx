"use client";
import { useState } from "react";

export default function PhoneVerificationForm() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  const handleSendCode = () => {
    alert(`Sending code to ${phone}`);
  };

  const handleVerify = () => {
    alert(`Verifying code ${code}`);
  };

  return (
    <div className="p-4 border rounded">
      <input
        type="text"
        placeholder="Enter phone"
        className="border p-2 w-full mb-2"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button onClick={handleSendCode} className="bg-blue-500 text-white px-4 py-2 rounded mb-2">
        Send Code
      </button>
      <input
        type="text"
        placeholder="Enter code"
        className="border p-2 w-full mb-2"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button onClick={handleVerify} className="bg-green-500 text-white px-4 py-2 rounded">
        Verify
      </button>
    </div>
  );
}
