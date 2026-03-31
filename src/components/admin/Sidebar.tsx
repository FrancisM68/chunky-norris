"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/admin/animals", label: "Animals", icon: "🐾" },
  { href: "/admin/treatments", label: "Treatments", icon: "💊" },
  { href: "/admin/tnr", label: "TNR Records", icon: "🐱" },
  { href: "/admin/volunteers", label: "Volunteers", icon: "👥" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        height: "100vh",
        backgroundColor: "#2D5A27",
        display: "flex",
        flexDirection: "column",
        color: "#fff",
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          padding: "24px 16px 16px",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        🐾 ChunkyNorris
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "0 8px" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
                backgroundColor: isActive ? "#fff" : "transparent",
                color: isActive ? "#2D5A27" : "#fff",
                transition: "background-color 0.15s",
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out button */}
      <div style={{ padding: "16px" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.3)",
            backgroundColor: "transparent",
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
