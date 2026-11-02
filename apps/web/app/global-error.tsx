"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Root recovery must reload the failed layout. */

// The root layout (including fonts, CSS, and providers) may have failed.
// Keep this recovery document self-contained and never render error details.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const action = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "0 16px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "none",
  } as const;
  return (
    <html lang="en" className="dark">
      <head>
        <title>Couldn’t load Screenly</title>
        <style>{` .desktop-guidance { display: none; } @media (max-width: 1023px) { .desktop-recovery { display: none !important; } .desktop-guidance { display: flex; } } `}</style>
      </head>
      <body
        style={{
          margin: 0,
          background: "#0a0a0a",
          colorScheme: "dark",
          color: "#f5f5f5",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <main
          className="desktop-recovery"
          style={{
            minHeight: "100dvh",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 560,
            margin: "0 auto",
            padding: "40px 24px",
          }}
        >
          <h1 style={{ fontSize: 28, letterSpacing: "-0.025em", margin: 0 }}>
            Screenly couldn’t load
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "#a3a3a3",
              margin: "16px 0 28px",
            }}
          >
            Try again, or reload Screenly to continue.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button
              onClick={reset}
              style={{
                ...action,
                border: "1px solid #d5e665",
                background: "#d5e665",
                color: "#26320f",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                ...action,
                border: "1px solid #62626b",
                color: "#f5f5f5",
              }}
            >
              Reload Screenly
            </a>
          </div>
        </main>
        <main
          className="desktop-guidance"
          style={{
            minHeight: "100dvh",
            boxSizing: "border-box",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: 560,
            margin: "0 auto",
            padding: "40px 24px",
          }}
        >
          <h1 style={{ fontSize: 24, margin: 0 }}>Use a wider window</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#a3a3a3" }}>
            Screenly needs a desktop or laptop window at least 1024 pixels wide.
          </p>
        </main>
      </body>
    </html>
  );
}
