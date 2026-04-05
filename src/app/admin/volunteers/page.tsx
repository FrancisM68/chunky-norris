export default function VolunteersPage() {
  return (
    <div>
      <div style={{ backgroundColor: "#2D5A27", padding: "24px 32px" }}>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 28,
            fontWeight: 600,
            color: "#fff",
            margin: 0,
          }}
        >
          Volunteers
        </h1>
        <div
          style={{
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.6)",
            marginTop: 4,
          }}
        >
          Fosters, admins, TNR operators, home check inspectors
        </div>
      </div>
      <div style={{ padding: "28px 32px" }}>
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.06)",
            padding: "48px 24px",
            textAlign: "center",
            color: "#9AA890",
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 14,
          }}
        >
          Coming soon
        </div>
      </div>
    </div>
  );
}
