export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1
        style={{
          fontSize: "4rem",
          margin: 0,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        SMAct
      </h1>
      <p
        style={{
          fontSize: "1.25rem",
          color: "#6e6e73",
          marginTop: "0.5rem",
          marginBottom: "3rem",
        }}
      >
        Activation service
      </p>
      <div
        style={{
          padding: "1rem 2rem",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          maxWidth: "500px",
        }}
      >
        <p style={{ margin: 0, fontSize: "1.1rem" }}>
          🎉 Hello World! Το site ζει.
        </p>
        <p
          style={{
            margin: "0.5rem 0 0 0",
            color: "#86868b",
            fontSize: "0.9rem",
          }}
        >
          Φάση 2 ολοκληρώθηκε — GitHub → Netlify → Internet ✓
        </p>
      </div>
    </main>
  );
}
