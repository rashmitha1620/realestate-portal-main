// import React from "react";
// import { Link, useNavigate } from "react-router-dom";

// export default function MESidebar() {
//   const navigate = useNavigate();

//   function logout() {
//     localStorage.removeItem("meToken");
//     localStorage.removeItem("user");
//     navigate("/marketing-executive/login");
//   }

//   return (
//     <div style={styles.sidebar}>
//       <h2 style={styles.logo}>ME Panel</h2>

//       <Link style={styles.link} to="/marketing-executive/dashboard">🏠 Dashboard</Link>
//       <Link style={styles.link} to="/marketing-executive/referred-agents">👥 Referred Agents</Link>
//       <Link style={styles.link} to="/marketing-executive/commissions">💰 Commissions</Link>

//       <button style={styles.logoutBtn} onClick={logout}>
//         🚪 Logout
//       </button>
//     </div>
//   );
// }

// const styles = {
//   sidebar: {
//     width: 240,
//     minHeight: "100vh",
//     background: "#003366",
//     color: "white",
//     padding: 20,
//     display: "flex",
//     flexDirection: "column",
//     gap: 20,
//   },
//   logo: {
//     fontSize: 22,
//     marginBottom: 10,
//     fontWeight: 700,
//   },
//   link: {
//     textDecoration: "none",
//     color: "white",
//     fontSize: 18,
//     padding: "8px 0",
//   },
//   logoutBtn: {
//     marginTop: "auto",
//     padding: "10px",
//     background: "#ff4444",
//     border: "none",
//     color: "white",
//     borderRadius: 6,
//     cursor: "pointer",
//   },
// };
