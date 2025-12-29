import React, { useState, useEffect } from "react";
import api from "../api/api";
import { useParams } from "react-router-dom";

export default function ViewService() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [form, setForm] = useState({name:"", email:"", phone:"", message:""});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function load() {
      const res = await api.get(`/services/${id}`);
      setService(res.data);
    }
    load();
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/service-enquiries/${id}/contact`, form);
      setMsg("Sent. Provider & admin notified");
    } catch (err) {
      setMsg("Failed sending");
    }
  };

  if (!service) return <p>Loading...</p>;

  return (
    <div style={{ padding:20 }}>
      <h2>{service.title}</h2>
      <p>{service.description}</p>
      <p>Provider: {service.provider?.name}</p>
      <h4>Contact Provider</h4>
      <form onSubmit={submit}>
        <input placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
        <input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
        <textarea placeholder="Message" value={form.message} onChange={e=>setForm({...form, message:e.target.value})} />
        <button type="submit">Send</button>
      </form>
      {msg && <p>{msg}</p>}
    </div>
  );
}
