import React, { useEffect, useState } from "react";
import api from "../api/api";

export default function ManageAgents() {
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [passwordUpdate, setPasswordUpdate] = useState({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  // 🔹 Fetch all agents on mount
  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await api.get("/admin/agents");
        setAgents(res.data);
        setLoading(false);
      } catch (err) {
        setError("❌ Failed to load agents");
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  // 🔹 Handle delete agent
  const deleteAgent = async (id) => {
    if (!window.confirm("Are you sure you want to delete this agent?")) return;
    try {
      await api.delete(`/admin/agents/${id}`);
      setAgents(agents.filter((a) => a._id !== id));
    } catch {
      alert("Failed to delete agent");
    }
  };

  // 🔹 Handle password update
  const updatePassword = async (id) => {
    const newPass = passwordUpdate[id];
    if (!newPass) return alert("Enter a new password first.");
    try {
      await api.put(`/admin/agents/${id}`, { password: newPass });
      alert("✅ Password updated successfully!");
      setPasswordUpdate((prev) => ({ ...prev, [id]: "" }));
    } catch {
      alert("Failed to update password");
    }
  };

  // 🔹 Add new agent
  const addAgent = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/admin/agents", form);
      setAgents([res.data.agent, ...agents]);
      alert("✅ Agent added successfully!");
      setForm({ name: "", email: "", phone: "", password: "" });
    } catch (err) {
      alert("Failed to add agent: " + (err.response?.data?.error || ""));
    }
  };

  if (loading) return <p>Loading agents...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="container" style={{ padding: "20px" }}>
      <h2>👥 Manage Agents</h2>

      {/* 📋 Agents List */}
      <h3>Existing Agents</h3>
      {agents.length === 0 ? (
        <p>No agents found.</p>
      ) : (
        <table
          border="1"
          cellPadding="8"
          style={{
            borderCollapse: "collapse",
            width: "100%",
            background: "white",
            borderRadius: "8px",
          }}
        >
          <thead style={{ background: "#f0f0f0" }}>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Agent ID</th>
              <th>New Password</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a._id}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{a.phone}</td>
                <td>{a.agentId}</td>
                <td>
                  <input
                    type="password"
                    placeholder="New password"
                    value={passwordUpdate[a._id] || ""}
                    onChange={(e) =>
                      setPasswordUpdate((prev) => ({
                        ...prev,
                        [a._id]: e.target.value,
                      }))
                    }
                  />
                </td>
                <td>
                  <button onClick={() => updatePassword(a._id)}>
                    Update
                  </button>
                  &nbsp;
                  <button
                    style={{ background: "red", color: "#fff" }}
                    onClick={() => deleteAgent(a._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
