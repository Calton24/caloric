"use client";

import { useEffect, useState } from "react";

export function RedirectBridge({ tokenHash }: { tokenHash: string }) {
  const [showFallback, setShowFallback] = useState(false);

  const deepLink = `caloric://auth/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

  useEffect(() => {
    window.location.href = deepLink;
    const timer = setTimeout(() => setShowFallback(true), 1500);
    return () => clearTimeout(timer);
  }, [deepLink]);

  return (
    <main style={styles.container}>
      {!showFallback ? (
        <>
          <h1 style={styles.heading}>Opening Caloric…</h1>
          <p style={styles.text}>You should be redirected to the app.</p>
        </>
      ) : (
        <>
          <h1 style={styles.heading}>Didn&apos;t open?</h1>
          <p style={styles.text}>
            If the app didn&apos;t open automatically, tap the button below.
          </p>
          <a href={deepLink} style={styles.button}>
            Open in Caloric
          </a>
          <a
            href="https://apps.apple.com/app/caloric/id6741090498"
            style={styles.storeLink}
          >
            Don&apos;t have the app? Get it on the App Store
          </a>
        </>
      )}
    </main>
  );
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
    marginBottom: "1.5rem",
  },
  button: {
    display: "inline-block",
    padding: "0.75rem 2rem",
    backgroundColor: "#000",
    color: "#fff",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "1rem",
    fontWeight: 600,
    marginBottom: "1rem",
  },
  storeLink: {
    fontSize: "0.875rem",
    color: "#007AFF",
    textDecoration: "none",
  },
} as const;
