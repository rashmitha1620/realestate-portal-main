import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL || "http://localhost:4000/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
  },
});

console.log("🔥 API LOADED →", api.defaults.baseURL);

// ========================================================
// ✅ SIMPLE & EFFECTIVE TOKEN HANDLING
// ========================================================
api.interceptors.request.use((config) => {
  // Skip auth for these routes
  const skipAuth =
    config.url.includes("forgot-password") ||
    config.url.includes("reset-password") ||
    config.url.includes("login") ||
    // ✅ CRITICAL ADDITION: Skip auth for ALL renewal endpoints
    config.url.includes("/renew") ||
    config.url.includes("/renew");

  if (!skipAuth) {
    // Try all possible token keys in priority order
    const tokenKeys = [
      'adminToken',
      'providerToken', 
      'agentToken',
      'meToken',
      'token'  // Generic fallback
    ];
    
    let finalToken = null;
    
    for (const key of tokenKeys) {
      const token = localStorage.getItem(key);
      if (token) {
        finalToken = token;
        console.log(`✅ Using ${key} for: ${config.url}`);
        break;
      }
    }
    
    if (finalToken) {
      config.headers.Authorization = `Bearer ${finalToken}`;
    } else {
      console.warn(`⚠️ No token found for: ${config.url}`);
    }
  } else {
    // ✅ EXPLICITLY REMOVE Authorization header for renewal endpoints
    if (config.url.includes("renewal/") || config.url.includes("/renewal/")) {
      console.log(`🔓 Skipping auth for renewal endpoint: ${config.url}`);
      delete config.headers.Authorization;
    }
  }

  return config;
});

// ========================================================
// ✅ SIMPLE RESPONSE HANDLER
// ========================================================
// ========================================================
// ✅ SIMPLE RESPONSE HANDLER
// ========================================================
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method} ${response.config.url}: ${response.status}`);
    return response;
  },
  (error) => {
    console.error("❌ API Error:", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });

    // 🔴 EXISTING 401 HANDLING (KEEP AS IS)
    if (error.response?.status === 401) {
      console.warn("🔒 401 Unauthorized - Clearing tokens");
      localStorage.clear();

      if (!window.location.pathname.includes("login")) {
        setTimeout(() => {
          window.location.href = "/";
        }, 100);
      }
    }

    // 🟢 ✅ ADD THIS BLOCK (SUBSCRIPTION EXPIRED HANDLING)
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === "SUBSCRIPTION_EXPIRED"
    ) {
      console.warn("⛔ Subscription expired - Redirecting to renewal");

      // ❌ Do NOT clear tokens (needed for renewal email detect)
      localStorage.setItem("subscriptionExpired", "1");

      if (!window.location.pathname.includes("subscription-renew")) {
        setTimeout(() => {
          window.location.href = "/subscription-renew";
        }, 100);
      }
    }

    return Promise.reject(error);
  }
);

export default api;