export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1
        style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "0.5rem" }}
      >
        Caloric
      </h1>
      <p style={{ fontSize: "1.125rem", color: "#666" }}>
        Track your nutrition effortlessly.
      </p>
    </main>
  );
}
