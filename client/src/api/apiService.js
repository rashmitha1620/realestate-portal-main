// client/src/api/apiService.js
import api from "./api";

/* ============================================
   AUTH API
============================================ */
export const AuthAPI = {
  me: () => api.get("/auth/me"),
};

/* ============================================
   AGENT API
============================================ */
export const AgentAPI = {
  register: (data) => api.post("/agents/register", data),

  login: async (data) => {
    const res = await api.post("/agents/login", data);

    localStorage.setItem("agentToken", res.data.token);
    localStorage.setItem("user", JSON.stringify({
      ...res.data.agent,
      isAgent: true,
    }));

    return res;
  },

  getAll: () => api.get("/agents"),
  getById: (id) => api.get(`/agents/${id}`),

 update: (id, data) => api.put(`/admin/agents/${id}`, data),


  // ✅ Admin delete agent
  delete: (id) => api.delete(`/admin/agents/${id}`)
};

/* ============================================
   PROPERTY API
============================================ */
export const PropertyAPI = {
  getAll: () => api.get("/properties"),
  getById: (id) => api.get(`/properties/${id}`),
  add: (data) => api.post("/properties", data),
  delete: (id) => api.delete(`/properties/${id}`),
};

/* ============================================
   ENQUIRY API
============================================ */
export const EnquiryAPI = {
  getAll: () => api.get("/enquiries"),
   adminAgentEnquiries: () => api.get("/enquiries/admin/agent-enquiries"),
  myEnquiries: () => api.get("/enquiries/my-enquiries"),
};

/* ============================================
   SERVICE PROVIDER API
============================================ */
export const ServiceProviderAPI = {
  login: async (data) => {
    const res = await api.post("/service-provider/login", data);

    localStorage.setItem("providerToken", res.data.token);
    localStorage.setItem("user", JSON.stringify({
      ...res.data.provider,
      isService: true,
    }));

    return res;
  },

  // ✅ ADD THIS
  forgotPassword: (data) =>
    api.post("/service-provider/forgot-password", data),

  // ✅ ADD THIS (for reset page)
  resetPassword: (token, data) =>
    api.post(`/service-provider/reset-password/${token}`, data),
  getAll: () => api.get("/service-provider/admin/list"),

   // ⭐ ADMIN — UPDATE PROVIDER
  update: (id, data) => api.put(`/service-provider/admin/${id}`, data),

  // ⭐ ADMIN — DELETE PROVIDER
  delete: (id) => api.delete(`/service-provider/admin/${id}`),


  uploadService: (formData) =>
  api.post(`/service-provider/service`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),

updateService: (id, formData) =>
  api.put(`/service-provider/service/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),

  getServiceById: (id) => api.get(`/service-provider/service/${id}`),

  myServices: () => api.get("/service-provider/my-services"),
  deleteService: (id) => api.delete(`/service-provider/service/${id}`),
  myServiceEnquiries: () => api.get("/service-provider/my-service-enquiries"),

};

/* ============================================
   PAYMENT API  (🔥 FIXED FULLY)
============================================ */
// Your backend routes:
// POST /api/payments/agent/create-order
// POST /api/payments/agent/verify
// POST /api/payments/service-provider/create-order
// POST /api/payments/service-provider/verify

export const PaymentAPI = {
  // AGENT PAYMENT FLOW
  createAgentOrder: (data) =>
    api.post("/payments/agent/create-order", data),

  verifyAgentPayment: (data) =>
    api.post("/payments/agent/verify", data),

  // PROVIDER PAYMENT FLOW
  createProviderOrder: (data) =>
    api.post("/payments/service-provider/create-order", data),

  verifyProviderPayment: (data) =>
    api.post("/payments/service-provider/verify", data),
};

/* ============================================
   ⭐ MARKETING EXECUTIVE API
============================================ */
export const MarketingExecutiveAPI = {
  register: (data) => api.post("/marketing-executive/register", data),

  login: async (data) => {
    const res = await api.post("/marketing-executive/login", data);

    localStorage.setItem("meToken", res.data.token);
    localStorage.setItem("user", JSON.stringify({
      ...res.data.exec,
      isMarketing: true,
    }));

    return res;
  },

  profile: () => api.get("/marketing-executive/me"),
  adminList: () => api.get("/marketing-executive/admin/list"),


  myReferredAgents: () =>
    api.get("/marketing-executive/my-referred-agents"),

  myReferredProviders: () =>
    api.get("/marketing-executive/my-referred-providers"),
};

export default api;
