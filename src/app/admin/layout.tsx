import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user.roles.includes("ADMIN")) {
    redirect("/foster");
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F5F0E8" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Slim top bar — user identity */}
        <header
          style={{
            height: 44,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 32px",
            backgroundColor: "#EDE8DF",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            fontSize: 13,
            color: "#6B7A5E",
            fontFamily: "'Instrument Sans', sans-serif",
            fontWeight: 500,
          }}
        >
          <span>{session.user.name}</span>
        </header>

        {/* Page content — no padding; each page owns its layout */}
        <main style={{ flex: 1, overflowY: "auto", background: "#F5F0E8" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
