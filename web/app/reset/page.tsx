import type { Metadata } from "next";
import { RedirectBridge } from "./redirect-bridge";

export const metadata: Metadata = {
  title: "Reset Password — Caloric",
  description: "Reset your Caloric account password",
};

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tokenHash =
    typeof params.token_hash === "string" ? params.token_hash : null;
  const type = typeof params.type === "string" ? params.type : null;

  if (!tokenHash || type !== "recovery") {
    return (
      <main style={styles.container}>
        <h1 style={styles.heading}>Invalid Link</h1>
        <p style={styles.text}>
          This password reset link is invalid or has expired. Please request a
          new one from the app.
        </p>
      </main>
    );
  }

  return <RedirectBridge tokenHash={tokenHash} />;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minHeight: "100vh",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: "2rem",
    textAlign: "center" as const,
  },
  heading: {
    fontSize: "1.5rem",
    marginBottom: "0.5rem",
  },
  text: {
    fontSize: "1rem",
    color: "#666",
    maxWidth: "400px",
    lineHeight: 1.5,
  },
} as const;
