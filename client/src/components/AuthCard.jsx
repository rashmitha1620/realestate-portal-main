import React from "react";

export default function AuthCard({ title, children }) {
  return (
    <div style={styles.page}>
      <style>
        {`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      <div style={styles.card}>
        <h2 style={styles.title}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background: "linear-gradient(135deg,#001f3f,#003f7f,#006fff)",
  },
  card: {
    width: 420,
    padding: "40px 35px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.12)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,0.22)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    animation: "slideUp 0.9s ease",
  },
  title: {
    textAlign: "center",
    marginBottom: 30,
    fontSize: 26,
    color: "#fff",
    fontWeight: 800,
  },
};
