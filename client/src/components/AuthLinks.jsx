import React from "react";
import { Link } from "react-router-dom";

export default function AuthLinks({ forgotPath, registerPath }) {
  return (
    <>
      <style>
        {`
          .auth-link {
            color: #00d2ff;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
          }
          .auth-link:hover {
            text-decoration: underline;
            text-shadow: 0 0 8px rgba(0,210,255,0.8);
          }
        `}
      </style>

      <div style={styles.links}>
        {forgotPath && (
          <Link to={forgotPath} className="auth-link">
            Forgot Password?
          </Link>
        )}
        {registerPath && (
          <Link to={registerPath} className="auth-link">
            New Registration
          </Link>
        )}
      </div>
    </>
  );
}

const styles = {
  links: {
    marginTop: 16,
    display: "flex",
    justifyContent: "space-between",
  },
};
