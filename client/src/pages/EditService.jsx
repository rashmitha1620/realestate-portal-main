import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ServiceProviderAPI } from "../api/apiService";
import { fixMediaUrl } from "../utils/fixMediaUrl";

export default function EditService() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const [service, setService] = useState({
    title: "",
    description: "",
    price: "",
    images: [],
  });

  const [newImages, setNewImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await ServiceProviderAPI.getServiceById(id);
        setService(res.data);
      } catch (err) {
        setMessage({ text: "Failed to load service", type: "error" });
        console.error("Load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Memory cleanup for preview URLs
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setMessage({ text: "Please drop image files only", type: "error" });
      return;
    }

    const newImageFiles = [...newImages, ...imageFiles];
    setNewImages(newImageFiles);

    // Create preview URLs
    const newPreviewUrls = imageFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  function handleNewImageChange(e) {
    handleFiles(Array.from(e.target.files));
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function deleteOldImage(index) {
    const updated = [...service.images];
    updated.splice(index, 1);
    setService({ ...service, images: updated });
  }

  function deleteNewImage(index) {
    // Revoke the preview URL
    URL.revokeObjectURL(previewUrls[index]);
    
    const updatedImages = [...newImages];
    updatedImages.splice(index, 1);
    setNewImages(updatedImages);

    const updatedPreviews = [...previewUrls];
    updatedPreviews.splice(index, 1);
    setPreviewUrls(updatedPreviews);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!service.title.trim() || !service.description.trim() || !service.price) {
      setMessage({ text: "Please fill all required fields", type: "error" });
      return;
    }

    try {
      setLoading(true);
      setMessage({ text: "", type: "" });

      const formData = new FormData();
      formData.append("title", service.title.trim());
      formData.append("description", service.description.trim());
      formData.append("price", service.price);

      // Append existing images as string URLs
      service.images.forEach((img) => {
        formData.append("existingImages", img);
      });

      // Append new image files
      newImages.forEach((file) => {
        formData.append("images", file);
      });

      await ServiceProviderAPI.updateService(id, formData);
      
      setMessage({ 
        text: "✅ Service updated successfully!", 
        type: "success" 
      });
      
      // Navigate after success
      setTimeout(() => {
        navigate("/service-my-services");
      }, 1500);

    } catch (err) {
      setMessage({ 
        text: `❌ Update failed: ${err.response?.data?.error || err.message}`, 
        type: "error" 
      });
      console.error("Submit error:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    if (window.confirm("Are you sure you want to cancel? Any unsaved changes will be lost.")) {
      navigate("/service-my-services");
    }
  }

  if (loading && !service.title) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading service details...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.heading}>Edit Service</h2>
          <button 
            onClick={handleCancel}
            style={styles.cancelButton}
            type="button"
          >
            ✕ Cancel
          </button>
        </div>

        {message.text && (
          <div style={{
            ...styles.message,
            background: message.type === "error" ? "#ffebee" : "#e8f5e9",
            color: message.type === "error" ? "#c62828" : "#2e7d32",
            borderLeft: `4px solid ${message.type === "error" ? "#f44336" : "#4caf50"}`
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Title */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Service Title <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={service.title}
              onChange={(e) =>
                setService({ ...service, title: e.target.value })
              }
              style={styles.input}
              placeholder="e.g., Professional House Cleaning"
              required
            />
          </div>

          {/* Description */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Description <span style={styles.required}>*</span>
            </label>
            <textarea
              value={service.description}
              onChange={(e) =>
                setService({ ...service, description: e.target.value })
              }
              style={styles.textarea}
              placeholder="Describe your service in detail..."
              rows="4"
              required
            />
            <div style={styles.charCount}>
              {service.description.length}/500 characters
            </div>
          </div>

          {/* Price */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Price (₹) <span style={styles.required}>*</span>
            </label>
            <div style={styles.priceContainer}>
              <span style={styles.pricePrefix}>₹</span>
              <input
                type="number"
                value={service.price}
                onChange={(e) =>
                  setService({ ...service, price: e.target.value })
                }
                style={styles.priceInput}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* Existing Images */}
          {service.images?.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <span style={styles.sectionIcon}>🖼️</span>
                Existing Images
                <span style={styles.imageCount}> ({service.images.length})</span>
              </h3>
              <div style={styles.imageGrid}>
                {service.images.map((img, index) => (
                  <div key={index} style={styles.imageBox}>
                    <img
                      src={fixMediaUrl(img)}
                      alt={`Service ${index + 1}`}
                      style={styles.image}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/120x120?text=Image+Error";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => deleteOldImage(index)}
                      style={styles.deleteBtn}
                      title="Delete image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Images Section */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <span style={styles.sectionIcon}>➕</span>
              Add New Images
            </h3>
            
            {/* Drag and Drop Zone */}
            <div
              ref={dropZoneRef}
              style={{
                ...styles.dropZone,
                borderColor: isDragging ? "#0a66c2" : "#d0d7de",
                background: isDragging ? "#f0f7ff" : "#fafbfc"
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={styles.dropZoneContent}>
                <div style={styles.dropZoneIcon}>📁</div>
                <p style={styles.dropZoneText}>
                  <strong>Click to select</strong> or drag & drop images here
                </p>
                <p style={styles.dropZoneSubtext}>
                  Supports JPG, PNG, WEBP (Max 5MB each)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleNewImageChange}
                style={styles.hiddenFileInput}
              />
            </div>

            {/* New Images Preview */}
            {previewUrls.length > 0 && (
              <div style={styles.imageGrid}>
                {previewUrls.map((url, index) => (
                  <div key={index} style={styles.imageBox}>
                    <img
                      src={url}
                      alt={`New image ${index + 1}`}
                      style={styles.image}
                    />
                    <button
                      type="button"
                      onClick={() => deleteNewImage(index)}
                      style={styles.deleteBtnNew}
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button
              type="button"
              onClick={handleCancel}
              style={styles.secondaryButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span style={styles.spinnerSmall}></span>
                  Updating...
                </>
              ) : (
                "Update Service"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --------------------------
      ADVANCED STYLES
--------------------------- */
const styles = {
  page: {
    background: "linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "40px 20px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },

  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "50vh",
    gap: "16px",
  },

  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #e4e8f0",
    borderTop: "4px solid #0a66c2",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  spinnerSmall: {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid #fff",
    borderTop: "2px solid transparent",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginRight: "8px",
  },

  card: {
    width: "100%",
    maxWidth: "720px",
    background: "#fff",
    padding: "32px 40px",
    borderRadius: "16px",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e1e5eb",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    paddingBottom: "16px",
    borderBottom: "1px solid #eaeaea",
  },

  heading: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#0a66c2",
    margin: 0,
    background: "linear-gradient(135deg, #0a66c2, #0d8bf2)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },

  cancelButton: {
    background: "transparent",
    border: "1px solid #d0d7de",
    color: "#666",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },

  message: {
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "24px",
    fontSize: "14px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  label: {
    fontWeight: "600",
    fontSize: "14px",
    color: "#333",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },

  required: {
    color: "#ff4757",
  },

  input: {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #d0d7de",
    outline: "none",
    fontSize: "15px",
    transition: "all 0.2s ease",
    background: "#fafbfc",
  },

  textarea: {
    padding: "12px 16px",
    minHeight: "120px",
    borderRadius: "8px",
    border: "1px solid #d0d7de",
    outline: "none",
    fontSize: "15px",
    resize: "vertical",
    transition: "all 0.2s ease",
    background: "#fafbfc",
    fontFamily: "inherit",
  },

  charCount: {
    fontSize: "12px",
    color: "#666",
    textAlign: "right",
    marginTop: "4px",
  },

  priceContainer: {
    display: "flex",
    alignItems: "center",
    background: "#fafbfc",
    border: "1px solid #d0d7de",
    borderRadius: "8px",
    overflow: "hidden",
  },

  pricePrefix: {
    padding: "0 16px",
    background: "#f0f7ff",
    color: "#0a66c2",
    fontWeight: "600",
    height: "48px",
    display: "flex",
    alignItems: "center",
    borderRight: "1px solid #d0d7de",
  },

  priceInput: {
    flex: 1,
    padding: "12px 16px",
    border: "none",
    outline: "none",
    fontSize: "15px",
    background: "transparent",
  },

  section: {
    padding: "20px",
    background: "#f8f9fa",
    borderRadius: "12px",
    border: "1px solid #eaeaea",
  },

  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#333",
    margin: "0 0 16px 0",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  sectionIcon: {
    fontSize: "20px",
  },

  imageCount: {
    color: "#666",
    fontWeight: "400",
    fontSize: "14px",
  },

  imageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: "16px",
    marginTop: "16px",
  },

  imageBox: {
    position: "relative",
    width: "100%",
    aspectRatio: "1",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    transition: "transform 0.2s ease",
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  deleteBtn: {
    position: "absolute",
    top: "8px",
    right: "8px",
    background: "#ff4757",
    color: "#fff",
    border: "none",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    transition: "all 0.2s ease",
  },

  deleteBtnNew: {
    position: "absolute",
    top: "8px",
    right: "8px",
    background: "#333",
    color: "#fff",
    border: "none",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    transition: "all 0.2s ease",
  },

  dropZone: {
    border: "2px dashed",
    borderRadius: "12px",
    padding: "40px 20px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    marginBottom: "20px",
  },

  dropZoneContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },

  dropZoneIcon: {
    fontSize: "48px",
    color: "#0a66c2",
  },

  dropZoneText: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#333",
    margin: 0,
  },

  dropZoneSubtext: {
    fontSize: "14px",
    color: "#666",
    margin: 0,
  },

  hiddenFileInput: {
    display: "none",
  },

  actionButtons: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "16px",
    marginTop: "32px",
    paddingTop: "24px",
    borderTop: "1px solid #eaeaea",
  },

  secondaryButton: {
    padding: "12px 28px",
    fontSize: "15px",
    fontWeight: "600",
    color: "#666",
    background: "#fff",
    border: "1px solid #d0d7de",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  submitBtn: {
    padding: "12px 32px",
    fontSize: "16px",
    fontWeight: "600",
    color: "#fff",
    background: "linear-gradient(135deg, #0a66c2, #0d8bf2)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "160px",
  },

  // Animation keyframes
  '@global': {
    '@keyframes spin': {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' },
    },
  },
};

// Add the keyframes to global styles
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`);