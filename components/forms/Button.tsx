"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <button
      className="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600 transition"
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
