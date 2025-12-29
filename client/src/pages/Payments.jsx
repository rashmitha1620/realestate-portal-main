import React, { useState } from "react";
import api from "../api/api";
import { loadStripe } from "@stripe/stripe-js";

export default function Payments() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubscribe = async () => {
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("❌ Please login first to subscribe.");
        setLoading(false);
        return;
      }

      const res = await api.post("/payments/create-checkout-session");
      const stripe = await loadStripe("pk_test_12345"); // ⚠️ Replace with your real Stripe public key
      await stripe.redirectToCheckout({ sessionId: res.data.url.split("session_id=")[1] });

    } catch (err) {
      console.error(err);
      setMessage("❌ Unable to start checkout: " + (err.response?.data?.error || "Server error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Subscribe to RealEstate Portal</h2>
      <p>Get access to post and promote unlimited properties.</p>

      <button
        onClick={handleSubscribe}
        disabled={loading}
        style={{
          background: "#635BFF",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "10px 20px",
          cursor: "pointer",
          marginTop: "10px",
          fontSize: "1.1em",
        }}
      >
        {loading ? "Redirecting to Stripe..." : "Subscribe Now (₹1500)"}
      </button>

      {message && <p style={{ marginTop: "20px", color: "red" }}>{message}</p>}
    </div>
  );
}
