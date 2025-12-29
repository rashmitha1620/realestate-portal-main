import React from "react";

export default function DeleteConfirmModal({ open, agent, onClose, onDeleted }) {
  if (!open || !agent) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>Delete Agent?</h3>

        <p>
          Are you sure you want to delete <b>{agent.name}</b> ({agent.email})?
        </p>

        <div style={styles.actions}>
          <button onClick={onClose} style={styles.cancelBtn}>
            Cancel
          </button>

          {/* ❗ THIS BUTTON MUST CALL onDeleted() — NOT just onDeleted */}
          <button
            onClick={() => {
              console.log("Delete button clicked in modal");
              onDeleted();                // ★ FIX
            }}
            style={styles.deleteBtn}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    maxWidth: 420,
    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    background: "#ddd",
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
  },
  deleteBtn: {
    background: "red",
    color: "white",
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
  },
};
