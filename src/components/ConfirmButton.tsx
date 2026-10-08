"use client";

export default function ConfirmButton({ children, message = "Tem certeza?", className = "btn-danger" }: { children: React.ReactNode; message?: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
