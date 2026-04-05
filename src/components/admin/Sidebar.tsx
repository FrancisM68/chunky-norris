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
      <div style={{ padding: "24px 20px 20px" }}>
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 20,
            fontWeight: 600,
            color: "#fff",
            lineHeight: 1.2,
          }}
        >
          ChunkyNorris
        </div>
        <div
          style={{
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 11,
            color: "rgba(255,255,255,0.55)",
            marginTop: 2,
          }}
        >
          Drogheda Animal Rescue
        </div>
      </div>

      {/* Section label */}
      <div
        style={{
          fontFamily: "'Instrument Sans', sans-serif",
          fontSize: 10,
          fontWeight: 600,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          padding: "8px 16px 6px",
        }}
      >
        Management
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
                padding: "10px 16px",
                borderRadius: 10,
                textDecoration: "none",
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.7)",
                transition: "background-color 0.15s, color 0.15s",
              }}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding: "16px" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%",
            padding: "10px 16px",
            borderRadius: 10,
            border: "1.5px solid rgba(255,255,255,0.25)",
            backgroundColor: "transparent",
            color: "rgba(255,255,255,0.7)",
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "border-color 0.15s, color 0.15s",
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
