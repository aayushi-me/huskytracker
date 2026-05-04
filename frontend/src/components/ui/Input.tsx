import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  className?: string;
}

export default function Input({
  label,
  className = "",
  id,
  ...props
}: InputProps) {
  // Ensure input always has an ID for label accessibility
  const inputId = id || `input-${Math.random().toString(36).slice(2)}`;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <input
        id={inputId}
        aria-label={label}
        {...props}
        className={`
          border border-gray-300 rounded-md px-3 py-2 
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1
          transition-all
          ${className}
        `}
      />
    </div>
  );
}
