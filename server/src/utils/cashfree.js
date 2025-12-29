const axios = require("axios");

/* ======================================================
   CASHFREE CONFIG HELPERS
====================================================== */

function getEnv() {
  const env = (process.env.CASHFREE_ENV || "sandbox").toLowerCase();

  if (["prod", "production", "live"].includes(env)) {
    return "production";
  }
  return "sandbox";
}

function getBaseUrl() {
  return getEnv() === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

function getHeaders(apiVersion = "2023-08-01") {
  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
    throw new Error("❌ CASHFREE_APP_ID or CASHFREE_SECRET_KEY missing");
  }

  return {
    "Content-Type": "application/json",
    "x-api-version": apiVersion,
    "x-client-id": process.env.CASHFREE_APP_ID,
    "x-client-secret": process.env.CASHFREE_SECRET_KEY,
  };
}

/* ======================================================
   AXIOS INSTANCE
====================================================== */

function createClient(apiVersion) {
  return axios.create({
    baseURL: getBaseUrl(),
    headers: getHeaders(apiVersion),
    timeout: 30000,
  });
}

/* ======================================================
   CASHFREE API WRAPPER
====================================================== */

const Cashfree = {
  /* ============================
     CREATE ORDER
  ============================ */
  PGCreateOrder: async (apiVersion, orderData) => {
    try {
      const client = createClient(apiVersion);

      console.log("🔄 Creating Cashfree order");
      console.log("ENV:", getEnv());
      console.log("Base URL:", getBaseUrl());

      const res = await client.post("/orders", orderData);

      console.log("✅ Order created:", res.data.order_id);
      console.log("✅ payment_session_id:", res.data.payment_session_id);

      return { data: res.data };
    } catch (err) {
      console.error("❌ Cashfree PGCreateOrder failed");
      console.error("Status:", err.response?.status || "NO_RESPONSE");
      console.error("Error:", err.response?.data || err.message);
      throw err;
    }
  },

  /* ============================
     FETCH ORDER
  ============================ */
  PGFetchOrder: async (apiVersion, orderId) => {
    try {
      const client = createClient(apiVersion);

      const res = await client.get(`/orders/${orderId}`);
      console.log("✅ Order status:", res.data.order_status);

      return { data: res.data };
    } catch (err) {
      console.error("❌ Cashfree PGFetchOrder failed");
      console.error("Error:", err.response?.data || err.message);
      throw err;
    }
  },

  /* ============================
     FETCH PAYMENTS
  ============================ */
  PGOrderPayments: async (apiVersion, orderId) => {
    try {
      const client = createClient(apiVersion);

      const res = await client.get(`/orders/${orderId}/payments`);
      return { data: res.data };
    } catch (err) {
      console.error("❌ Cashfree PGOrderPayments failed");
      console.error("Error:", err.response?.data || err.message);
      throw err;
    }
  },
};

module.exports = Cashfree;
