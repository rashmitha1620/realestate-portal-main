import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fixMediaUrl } from "../utils/fixMediaUrl";
import api from "../api/api";

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState("");

  // Main image + lightbox
  const [mainImage, setMainImage] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Enquiry form
  const [submitMsg, setSubmitMsg] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    message: "",
    propertyId: id 
  });

  // 360 viewer state
  const [panoramaUrl, setPanoramaUrl] = useState(null);
  const [panoramaLoaded, setPanoramaLoaded] = useState(false);
  const panRef = useRef({ 
    dragging: false, 
    startX: 0, 
    offset: 50,
    isTouch: false 
  });
  const panElRef = useRef(null);

  // EMI calculator state
  const [loanInputs, setLoanInputs] = useState({
    price: 0,
    downPercent: 10,
    interestAnnual: 8.5,
    tenureYears: 10,
  });
  const [emiResult, setEmiResult] = useState({ 
    emi: 0, 
    totalPayment: 0, 
    totalInterest: 0, 
    schedule: [],
    loanAmount: 0 
  });

  // Load property data
  useEffect(() => {
    async function loadProperty() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/properties/${id}`);
        const p = res.data;
        setProperty(p);

        // Set main image
        if (p.images?.length > 0) {
          const firstImage = fixMediaUrl(p.images[0]);
          setMainImage(firstImage);
        }

        // Detect panorama image
        if (p.panorama) {
          setPanoramaUrl(fixMediaUrl(p.panorama));
        } else if (p.images?.length) {
          const found = p.images.find((u) => 
            /360|panorama|pano/i.test(u) || 
            /360|panorama|pano/i.test(p.title || "")
          );
          if (found) setPanoramaUrl(fixMediaUrl(found));
        }

        // Set EMI calculator with property price
        if (p.price) {
          setLoanInputs(prev => ({ 
            ...prev, 
            price: Number(p.price) || 0 
          }));
        }

        // Load related properties
        await loadRelated(p.city, p.areaName, p._id);
        
      } catch (err) {
        console.error("Error loading property:", err);
        setError("Failed to load property details. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    
    loadProperty();
  }, [id]);

  // Load related properties
  const loadRelated = async (city, areaName, currentId) => {
    try {
      const res = await api.get("/properties", {
        params: {
          limit: 8,
          exclude: currentId,
          city: city,
          area: areaName
        }
      });
      
      const data = res.data || [];
      const matches = data.filter(p => 
        p._id !== currentId &&
        (p.city?.toLowerCase() === city?.toLowerCase() ||
         p.areaName?.toLowerCase() === areaName?.toLowerCase())
      );
      setRelated(matches.slice(0, 8));
    } catch (err) {
      console.error("Related properties error:", err);
      setRelated([]);
    }
  };

  /* ---------------- Lightbox controls ---------------- */
  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden"; // Prevent scrolling
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "auto";
  };

  const nextImage = () => {
    if (!property?.images) return;
    setLightboxIndex((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = () => {
    if (!property?.images) return;
    setLightboxIndex((prev) => 
      prev === 0 ? property.images.length - 1 : prev - 1
    );
  };

  /* ---------------- Enquiry submit ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMsg("");
    setFormSubmitting(true);

    // Basic validation
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setSubmitMsg("❌ Please fill in all required fields");
      setFormSubmitting(false);
      return;
    }

    try {
      await api.post("/enquiries", {
        propertyId: property._id,
        agentId: property.agent?._id,
        propertyTitle: property.title,
        ...form,
      });
      
      setSubmitMsg("✅ Enquiry submitted successfully! We'll contact you soon.");
      setForm({ 
        name: "", 
        email: "", 
        phone: "", 
        message: "",
        propertyId: id 
      });
      
      // Clear success message after 5 seconds
      setTimeout(() => setSubmitMsg(""), 5000);
    } catch (err) {
      console.error("Enquiry submission error:", err);
      setSubmitMsg("❌ Failed to submit enquiry. Please try again.");
    } finally {
      setFormSubmitting(false);
    }
  };

  /* ---------------- Panorama viewer handlers ---------------- */
  const onPanStart = (e) => {
    e.preventDefault();
    panRef.current.dragging = true;
    panRef.current.isTouch = e.type.startsWith("touch");
    const clientX = panRef.current.isTouch ? e.touches[0].clientX : e.clientX;
    panRef.current.startX = clientX;
    
    if (panElRef.current) {
      panElRef.current.style.cursor = "grabbing";
    }
  };

  const onPanMove = (e) => {
    if (!panRef.current.dragging || !panElRef.current) return;
    
    const clientX = panRef.current.isTouch ? e.touches[0].clientX : e.clientX;
    const dx = clientX - panRef.current.startX;
    const width = panElRef.current.offsetWidth;
    const deltaPercent = (dx / width) * 100 * 1.5; // Sensitivity factor
    
    let newOffset = panRef.current.offset + deltaPercent;
    // Keep between 0 and 100
    newOffset = ((newOffset % 100) + 100) % 100;
    
    panRef.current.startX = clientX;
    panRef.current.offset = newOffset;
    
    panElRef.current.style.backgroundPosition = `${newOffset}% 50%`;
  };

  const onPanEnd = () => {
    panRef.current.dragging = false;
    if (panElRef.current) {
      panElRef.current.style.cursor = "grab";
    }
  };

  /* ---------------- EMI Calculator ---------------- */
  useEffect(() => {
    computeEmi();
  }, [loanInputs]);

  function computeEmi() {
    const P_full = Number(loanInputs.price) || 0;
    const downPercent = Number(loanInputs.downPercent) || 0;
    const loanAmount = P_full * (1 - downPercent / 100);
    const annualRate = Number(loanInputs.interestAnnual) || 0;
    const monthlyRate = annualRate / 12 / 100;
    const n = Number(loanInputs.tenureYears) * 12 || 1;

    if (loanAmount <= 0) {
      setEmiResult({
        emi: 0,
        totalPayment: 0,
        totalInterest: 0,
        loanAmount: 0,
        schedule: []
      });
      return;
    }

    let emi = 0;
    if (monthlyRate === 0) {
      emi = loanAmount / n;
    } else {
      const pow = Math.pow(1 + monthlyRate, n);
      emi = (loanAmount * monthlyRate * pow) / (pow - 1);
    }

    const totalPayment = emi * n;
    const totalInterest = totalPayment - loanAmount;

    setEmiResult({
      emi,
      totalPayment,
      totalInterest,
      loanAmount,
      schedule: buildSchedule(loanAmount, monthlyRate, n, emi),
    });
  }

  function buildSchedule(principal, monthlyRate, n, emi) {
    const sch = [];
    let bal = principal;
    for (let i = 1; i <= Math.min(n, 6); i++) { // Show first 6 months
      const interest = bal * monthlyRate;
      const principalRepay = emi - interest;
      bal = Math.max(bal - principalRepay, 0);
      sch.push({
        month: i,
        interest,
        principalRepay,
        balance: bal,
        emi: emi
      });
    }
    return sch;
  }

  /* ---------------- Map embed source ---------------- */
  const getMapSrc = () => {
    const coords = property?.location?.coordinates;
    if (coords && coords.length >= 2) {
      const [lng, lat] = coords;
      return `https://www.google.com/maps/embed/v1/view?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY || 'AIzaSyB5qkKn8Dc_Y8m4U2r6M33iBw96vzZ2N_A'}&center=${lat},${lng}&zoom=15&maptype=roadmap`;
    }
    const q = encodeURIComponent(property?.address || property?.areaName || property?.title || "");
    return `https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY || 'AIzaSyB5qkKn8Dc_Y8m4U2r6M33iBw96vzZ2N_A'}&q=${q}&zoom=15`;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(Math.round(amount || 0));
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading property details...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div style={styles.errorContainer}>
        <h2>⚠️ {error || "Property not found"}</h2>
        <button 
          onClick={() => navigate(-1)} 
          style={styles.backButton}
        >
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @media (max-width: 768px) {
          .pdLayout {
            flex-direction: column;
          }
          .pdRight {
            position: static;
            width: 100%;
            margin-top: 20px;
          }
          .emiResult {
            flex-direction: column;
            gap: 10px;
          }
        }
      `}</style>

      {/* Back button */}
      <button 
        onClick={() => navigate(-1)} 
        style={styles.backButton}
      >
        ← Back to Properties
      </button>

      {/* MAIN IMAGE PREVIEW */}
      <div 
        style={styles.mainImageWrap} 
        onClick={() => openLightbox(0)}
        title="Click to view fullscreen"
      >
        <img 
          src={mainImage || "/placeholder-property.jpg"} 
          style={styles.mainImage} 
          alt={property.title}
          onError={(e) => {
            e.target.src = "/placeholder-property.jpg";
          }}
        />
        <div style={styles.imageOverlay}>
          <span>Click to view fullscreen</span>
        </div>
      </div>

      <div className="pdLayout" style={styles.layout}>
        {/* LEFT COLUMN */}
        <div style={styles.left}>
          {/* Title and Price */}
          <h1 style={styles.title}>{property.title}</h1>
          
          <div style={styles.priceRow}>
            <span style={styles.price}>₹ {formatCurrency(property.price)}</span>
            {property.pricePerSqFt && (
              <span style={styles.pricePerSqFt}>
                (₹{formatCurrency(property.pricePerSqFt)}/sq.ft)
              </span>
            )}
          </div>
          
          <div style={styles.locationRow}>
            <span style={styles.location}>📍 {property.address || property.areaName}</span>
            {property.city && (
              <span style={styles.city}>{property.city}</span>
            )}
          </div>

          <hr style={styles.divider} />

          {/* PHOTOS GALLERY */}
          <h3 style={styles.sectionTitle}>Photos ({property.images?.length || 0})</h3>
          <div style={styles.galleryRow}>
            {property.images?.map((img, i) => (
              <div key={i} style={styles.thumbContainer}>
                <img
                  src={fixMediaUrl(img)}
                  style={{
                    ...styles.thumb,
                    border: mainImage?.includes(img) ? "3px solid #0066ff" : "3px solid transparent"
                  }}
                  onClick={() => setMainImage(fixMediaUrl(img))}
                  onDoubleClick={() => openLightbox(i)}
                  alt={`Property view ${i + 1}`}
                  onError={(e) => {
                    e.target.src = "/placeholder-property.jpg";
                  }}
                />
                <div style={styles.thumbOverlay} onClick={() => openLightbox(i)}>
                  <span>View</span>
                </div>
              </div>
            ))}
          </div>

          {/* 360 Virtual Tour */}
          <div style={{ marginTop: 24 }}>
            <h3 style={styles.sectionTitle}>
              360° Virtual Tour
              {panoramaUrl && (
                <span style={styles.badge}>Interactive</span>
              )}
            </h3>
            
            {panoramaUrl ? (
              <div style={styles.panoramaContainer}>
                <div
                  ref={panElRef}
                  style={{
                    ...styles.panorama,
                    backgroundImage: `url("${panoramaUrl}")`,
                    backgroundPosition: `${panRef.current.offset}% 50%`,
                    opacity: panoramaLoaded ? 1 : 0.5
                  }}
                  onMouseDown={onPanStart}
                  onMouseMove={onPanMove}
                  onMouseUp={onPanEnd}
                  onMouseLeave={onPanEnd}
                  onTouchStart={onPanStart}
                  onTouchMove={onPanMove}
                  onTouchEnd={onPanEnd}
                  title="Drag to rotate • Double-click to open fullscreen"
                  onDoubleClick={() => {
                    const idx = property.images?.findIndex(img => 
                      panoramaUrl.includes(img) || img.includes('360') || img.includes('panorama')
                    );
                    if (idx >= 0) openLightbox(idx);
                  }}
                >
                  {!panoramaLoaded && (
                    <div style={styles.loadingOverlay}>
                      <div style={styles.miniSpinner}></div>
                      <span>Loading panorama...</span>
                    </div>
                  )}
                  <img
                    src={panoramaUrl}
                    style={{ display: 'none' }}
                    onLoad={() => setPanoramaLoaded(true)}
                    onError={() => setPanoramaLoaded(false)}
                    alt=""
                  />
                  <div style={styles.panoramaHint}>
                    <span>← Drag to rotate →</span>
                    <br />
                    <small>Double-click for fullscreen</small>
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.panoramaFallback}>
                <p>No 360° virtual tour available for this property.</p>
                <button
                  style={styles.secondaryButton}
                  onClick={() => {
                    if (property.images?.length) openLightbox(0);
                  }}
                >
                  View Photo Gallery
                </button>
              </div>
            )}
          </div>

          <hr style={styles.divider} />

          {/* VIDEO TOUR */}
          {property.videoUrl && (
            <>
              <h3 style={styles.sectionTitle}>Video Tour</h3>
              <div style={styles.videoWrapper}>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  style={styles.video}
                  poster={mainImage}
                >
                  <source
                    src={fixMediaUrl(property.videoUrl)}
                    type="video/mp4"
                  />
                  Your browser does not support the video tag.
                </video>
              </div>
              <hr style={styles.divider} />
            </>
          )}

         {/* MAP VIEW */}
<h3 style={styles.sectionTitle}>Location</h3>
<div style={styles.mapWrap}>
  <iframe
    title="Property location"
    src={`https://maps.google.com/maps?q=${encodeURIComponent(
      property.address || 
      property.areaName || 
      property.title || 
      property.city || 
      'India'
    )}&output=embed`}
    width="100%"
    height="300"
    style={{
      border: 0,
      borderRadius: 10,
      marginBottom: 15
    }}
    loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
    allowFullScreen
  />
  
  <div style={styles.mapActionsRow}>
    <button
      style={styles.secondaryButton}
      onClick={() => {
        const query = encodeURIComponent(
          property.address || 
          property.areaName || 
          property.title || 
          property.city || 
          'India'
        );
        const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
        window.open(url, "_blank", "noopener,noreferrer");
      }}
    >
      Open in Google Maps
    </button>
    
    <button
      style={styles.secondaryButton}
      onClick={() => {
        const query = encodeURIComponent(
          property.address || 
          property.areaName || 
          property.title || 
          property.city || 
          'India'
        );
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
        const text = `Check out this property: ${property.title} at ${property.address}`;
        
        if (navigator.share) {
          navigator.share({
            title: property.title || 'Property',
            text: text,
            url: mapsUrl
          });
        } else {
          navigator.clipboard.writeText(mapsUrl);
          alert("Map link copied to clipboard!");
        }
      }}
    >
      Share Location
    </button>
  </div>
</div>
          <hr style={styles.divider} />

          {/* DESCRIPTION */}
          <h3 style={styles.sectionTitle}>About This Property</h3>
          <div style={styles.description}>
            {property.description ? (
              <p style={styles.descriptionText}>{property.description}</p>
            ) : (
              <p style={styles.noDescription}>No description available.</p>
            )}
          </div>

          <hr style={styles.divider} />

          {/* EMI CALCULATOR */}
          <h3 style={styles.sectionTitle}>EMI Calculator</h3>
          <div style={styles.emiWrap}>
            <div style={styles.emiGrid}>
              <div style={styles.emiInputGroup}>
                <label style={styles.emiLabel}>Property Price</label>
                <div style={styles.inputWithUnit}>
                  <span style={styles.unit}>₹</span>
                  <input
                    type="number"
                    min="0"
                    value={loanInputs.price}
                    onChange={(e) => setLoanInputs({ ...loanInputs, price: Number(e.target.value) || 0 })}
                    style={styles.emiInput}
                  />
                </div>
              </div>

              <div style={styles.emiInputGroup}>
                <label style={styles.emiLabel}>Down Payment</label>
                <div style={styles.inputWithUnit}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={loanInputs.downPercent}
                    onChange={(e) => setLoanInputs({ ...loanInputs, downPercent: Number(e.target.value) || 0 })}
                    style={styles.emiInput}
                  />
                  <span style={styles.unit}>%</span>
                </div>
                <div style={styles.helperText}>
                  Amount: ₹{formatCurrency(loanInputs.price * (loanInputs.downPercent / 100))}
                </div>
              </div>

              <div style={styles.emiInputGroup}>
                <label style={styles.emiLabel}>Interest Rate</label>
                <div style={styles.inputWithUnit}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={loanInputs.interestAnnual}
                    onChange={(e) => setLoanInputs({ ...loanInputs, interestAnnual: Number(e.target.value) || 0 })}
                    style={styles.emiInput}
                  />
                  <span style={styles.unit}>% p.a.</span>
                </div>
              </div>

              <div style={styles.emiInputGroup}>
                <label style={styles.emiLabel}>Loan Tenure</label>
                <div style={styles.inputWithUnit}>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={loanInputs.tenureYears}
                    onChange={(e) => setLoanInputs({ ...loanInputs, tenureYears: Number(e.target.value) || 1 })}
                    style={styles.emiInput}
                  />
                  <span style={styles.unit}>years</span>
                </div>
              </div>
            </div>

            <div style={styles.emiResult}>
              <div style={styles.emiResultCard}>
                <div style={styles.emiResultLabel}>Loan Amount</div>
                <div style={styles.emiResultValue}>
                  ₹ {formatCurrency(emiResult.loanAmount)}
                </div>
              </div>
              <div style={styles.emiResultCard}>
                <div style={styles.emiResultLabel}>Monthly EMI</div>
                <div style={styles.emiResultValue}>
                  ₹ {formatCurrency(emiResult.emi)}
                </div>
              </div>
              <div style={styles.emiResultCard}>
                <div style={styles.emiResultLabel}>Total Interest</div>
                <div style={styles.emiResultValue}>
                  ₹ {formatCurrency(emiResult.totalInterest)}
                </div>
              </div>
              <div style={styles.emiResultCard}>
                <div style={styles.emiResultLabel}>Total Payment</div>
                <div style={styles.emiResultValue}>
                  ₹ {formatCurrency(emiResult.totalPayment)}
                </div>
              </div>
            </div>

            {emiResult.schedule?.length > 0 && (
              <div style={styles.amortPreview}>
                <div style={styles.amortTitle}>
                  Payment Schedule (First {emiResult.schedule.length} Months)
                </div>
                <div style={styles.amortTable}>
                  <div style={styles.amortHeader}>
                    <div>Month</div>
                    <div>EMI</div>
                    <div>Principal</div>
                    <div>Interest</div>
                    <div>Balance</div>
                  </div>
                  {emiResult.schedule.map((r) => (
                    <div key={r.month} style={styles.amortRow}>
                      <div style={styles.amortCell}>{r.month}</div>
                      <div style={styles.amortCell}>₹{formatCurrency(r.emi)}</div>
                      <div style={styles.amortCell}>₹{formatCurrency(r.principalRepay)}</div>
                      <div style={styles.amortCell}>₹{formatCurrency(r.interest)}</div>
                      <div style={styles.amortCell}>₹{formatCurrency(r.balance)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <hr style={styles.divider} />

          {/* PROPERTY DETAILS */}
          <h3 style={styles.sectionTitle}>Property Details</h3>
          <div style={styles.factsGrid}>
            {[
              { label: "Area", value: property.areaName },
              { label: "Project", value: property.projectName },
              { label: "Nearby Highway", value: property.nearbyHighway },
              { label: "Property Type", value: property.propertyType },
              { label: "Built-up Area", value: property.builtUpArea && `${property.builtUpArea} sq.ft` },
              { label: "Carpet Area", value: property.carpetArea && `${property.carpetArea} sq.ft` },
              { label: "Bedrooms", value: property.bedrooms },
              { label: "Bathrooms", value: property.bathrooms },
              { label: "Parking", value: property.parking && `${property.parking} spots` },
              { label: "Furnishing", value: property.furnishing },
              { label: "Floor", value: property.floor },
              { label: "Total Floors", value: property.totalFloors },
            ].map((item, index) => (
              item.value && (
                <div key={index} style={styles.factBox}>
                  <div style={styles.factLabel}>{item.label}</div>
                  <div style={styles.factValue}>{item.value || "—"}</div>
                </div>
              )
            ))}
          </div>

          {/* AMENITIES */}
          {property.amenities?.length > 0 && (
            <>
              <hr style={styles.divider} />
              <h3 style={styles.sectionTitle}>Amenities</h3>
              <div style={styles.amenitiesGrid}>
                {property.amenities.map((amenity, index) => (
                  <div key={index} style={styles.amenityItem}>
                    <span style={styles.amenityIcon}>✓</span>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* RELATED PROPERTIES */}
          {related.length > 0 && (
            <>
              <hr style={styles.divider} />
              <h3 style={styles.sectionTitle}>Similar Properties</h3>
              <div style={styles.relatedRow}>
                {related.map((p) => (
                  <div 
                    key={p._id} 
                    style={styles.relatedCard}
                    onClick={() => navigate(`/property/${p._id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && navigate(`/property/${p._id}`)}
                  >
                    <div style={styles.relatedImageContainer}>
                      <img 
                        src={p.images?.[0] ? fixMediaUrl(p.images[0]) : "/placeholder-property.jpg"} 
                        alt={p.title}
                        style={styles.relatedImg}
                        onError={(e) => {
                          e.target.src = "/placeholder-property.jpg";
                        }}
                      />
                      <div style={styles.relatedOverlay}>
                        <span>View Details</span>
                      </div>
                    </div>
                    <div style={styles.relatedContent}>
                      <div style={styles.relatedTitle}>{p.title}</div>
                      <div style={styles.relatedPrice}>₹ {formatCurrency(p.price)}</div>
                      <div style={styles.relatedLoc}>
                        <span>📍 {p.areaName}, {p.city}</span>
                      </div>
                      {p.bedrooms && (
                        <div style={styles.relatedSpecs}>
                          <span>{p.bedrooms} Beds</span>
                          {p.bathrooms && <span>• {p.bathrooms} Baths</span>}
                          {p.builtUpArea && <span>• {p.builtUpArea} sq.ft</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="pdRight" style={styles.right}>
          {/* AGENT INFO */}
          {property.agent && (
            <div style={styles.agentCard}>
              <h3 style={styles.agentTitle}>Agent Information</h3>
              <div style={styles.agentInfo}>
                <div style={styles.agentAvatar}>
                  {property.agent.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={styles.agentName}>{property.agent.name}</p>
                  <p style={styles.agentEmail}>{property.agent.email}</p>
                  {property.agent.phone && (
                    <p style={styles.agentPhone}>{property.agent.phone}</p>
                  )}
                  {property.agent.company && (
                    <p style={styles.agentCompany}>{property.agent.company}</p>
                  )}
                </div>
              </div>
              {property.agent.bio && (
                <p style={styles.agentBio}>{property.agent.bio}</p>
              )}
            </div>
          )}

          {/* ENQUIRY FORM */}
          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>Contact Agent</h3>
            <p style={styles.formSubtitle}>Get more information or schedule a visit</p>
            
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <input
                  type="text"
                  placeholder="Your Name *"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={styles.input}
                  disabled={formSubmitting}
                />
              </div>
              
              <div style={styles.formGroup}>
                <input
                  type="email"
                  placeholder="Email Address *"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={styles.input}
                  disabled={formSubmitting}
                />
              </div>
              
              <div style={styles.formGroup}>
                <input
                  type="tel"
                  placeholder="Phone Number *"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  style={styles.input}
                  disabled={formSubmitting}
                />
              </div>
              
              <div style={styles.formGroup}>
                <textarea
                  placeholder="Your Message (Optional)"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  style={styles.textarea}
                  rows="4"
                  disabled={formSubmitting}
                />
              </div>
              
              <button 
                type="submit" 
                style={styles.btn}
                disabled={formSubmitting}
              >
                {formSubmitting ? (
                  <>
                    <div style={styles.buttonSpinner}></div>
                    Sending...
                  </>
                ) : (
                  'Send Enquiry'
                )}
              </button>
              
              {submitMsg && (
                <p style={{
                  ...styles.msg,
                  color: submitMsg.includes('✅') ? '#2e7d32' : '#d32f2f'
                }}>
                  {submitMsg}
                </p>
              )}
              
              <p style={styles.privacyNote}>
                By submitting, you agree to our Terms & Privacy Policy.
              </p>
            </form>
          </div>

          {/* QUICK ACTIONS */}
          <div style={styles.quickActions}>
            <button
              style={styles.actionButton}
              onClick={() => {
                const phone = property.agent?.phone || '+911234567890';
                window.location.href = `tel:${phone}`;
              }}
            >
              📞 Call Now
            </button>
            <button
              style={styles.actionButton}
              onClick={() => {
                const email = property.agent?.email || 'info@example.com';
                window.location.href = `mailto:${email}?subject=Regarding: ${property.title}`;
              }}
            >
              ✉️ Email Agent
            </button>
            <button
              style={styles.actionButton}
              onClick={() => {
                // Save to favorites/bookmarks
                alert('Added to favorites!');
              }}
            >
              ⭐ Save Property
            </button>
          </div>
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightboxOpen && (
        <Lightbox
          images={property.images || []}
          index={lightboxIndex}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}
    </div>
  );
}

/* ================ Lightbox Component ================ */
function Lightbox({ images, index, onClose, onNext, onPrev }) {
  const lightboxRef = useRef(null);
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    
    const handleClickOutside = (e) => {
      if (lightboxRef.current && !lightboxRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, onNext, onPrev]);
  
  if (!images || images.length === 0) return null;
  
  return (
    <div style={lightboxStyles.overlay}>
      <div ref={lightboxRef} style={lightboxStyles.container}>
        <button 
          style={lightboxStyles.close} 
          onClick={onClose}
          aria-label="Close lightbox"
        >
          ✕
        </button>
        
        <button 
          style={lightboxStyles.navButton}
          onClick={onPrev}
          aria-label="Previous image"
        >
          ‹
        </button>
        
        <div style={lightboxStyles.content}>
          <img 
            src={fixMediaUrl(images[index])} 
            style={lightboxStyles.image} 
            alt={`Property view ${index + 1}`}
          />
          <div style={lightboxStyles.caption}>
            <span>{index + 1} / {images.length}</span>
          </div>
        </div>
        
        <button 
          style={{...lightboxStyles.navButton, right: 20}}
          onClick={onNext}
          aria-label="Next image"
        >
          ›
        </button>
        
        <div style={lightboxStyles.thumbnails}>
          {images.slice(0, 8).map((img, i) => (
            <img
              key={i}
              src={fixMediaUrl(img)}
              style={{
                ...lightboxStyles.thumbnail,
                opacity: i === index ? 1 : 0.6
              }}
              onClick={() => {
                // Navigate to clicked thumbnail
                const event = new CustomEvent('lightboxNavigate', { detail: i });
                window.dispatchEvent(event);
              }}
              alt=""
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========================= STYLES ========================= */
const styles = {
  page: {
    padding: "20px 40px",
    background: "#f5f7fb",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    minHeight: "100vh",
    animation: "fadeIn 0.3s ease-out"
  },
  
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: "20px"
  },
  
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: "20px",
    textAlign: "center"
  },
  
  spinner: {
    width: "50px",
    height: "50px",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #0066ff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  
  miniSpinner: {
    width: "20px",
    height: "20px",
    border: "2px solid #f3f3f3",
    borderTop: "2px solid #0066ff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  
  backButton: {
    padding: "10px 20px",
    background: "transparent",
    border: "1px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    transition: "all 0.2s",
    "&:hover": {
      background: "#f0f0f0"
    }
  },
  
  mainImageWrap: {
    position: "relative",
    width: "100%",
    height: "500px",
    borderRadius: "16px",
    overflow: "hidden",
    marginBottom: "24px",
    cursor: "zoom-in",
    boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
    transition: "transform 0.3s",
    "&:hover": {
      transform: "translateY(-2px)"
    }
  },
  
  mainImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.3s"
  },
  
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
    color: "white",
    padding: "20px",
    textAlign: "center",
    fontSize: "14px",
    opacity: 0,
    transition: "opacity 0.3s"
  },
  
  layout: {
    display: "flex",
    gap: "40px",
    alignItems: "flex-start"
  },
  
  left: {
    flex: 2.5,
    minWidth: 0 // Prevents overflow
  },
  
  right: {
    flex: 1,
    position: "sticky",
    top: "20px",
    alignSelf: "flex-start"
  },
  
  title: {
    fontSize: "36px",
    fontWeight: 800,
    color: "#0a2540",
    marginBottom: "8px",
    lineHeight: 1.2
  },
  
  priceRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "8px"
  },
  
  price: {
    color: "#d32f2f",
    fontSize: "28px",
    fontWeight: 800
  },
  
  pricePerSqFt: {
    color: "#666",
    fontSize: "16px",
    background: "#f0f0f0",
    padding: "4px 12px",
    borderRadius: "20px"
  },
  
  locationRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px"
  },
  
  location: {
    fontSize: "16px",
    color: "#444",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  
  city: {
    background: "#e3f2fd",
    color: "#0066ff",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: 600
  },
  
  badge: {
    background: "#0066ff",
    color: "white",
    fontSize: "12px",
    padding: "2px 8px",
    borderRadius: "12px",
    marginLeft: "10px",
    verticalAlign: "middle"
  },
  
  divider: {
    margin: "32px 0",
    border: "none",
    height: "1px",
    background: "linear-gradient(90deg, transparent, #ddd, transparent)"
  },
  
  sectionTitle: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#0a2540",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center"
  },
  
  galleryRow: {
    display: "flex",
    gap: "12px",
    overflowX: "auto",
    paddingBottom: "12px",
    marginBottom: "24px"
  },
  
  thumbContainer: {
    position: "relative",
    flexShrink: 0
  },
  
  thumb: {
    width: "140px",
    height: "105px",
    objectFit: "cover",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
    "&:hover": {
      transform: "scale(1.05)"
    }
  },
  
  thumbOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    borderRadius: "12px",
    opacity: 0,
    transition: "opacity 0.2s",
    cursor: "pointer",
    "&:hover": {
      opacity: 1
    }
  },
  
  panoramaContainer: {
    position: "relative",
    marginBottom: "24px"
  },
  
  panorama: {
    height: "280px",
    borderRadius: "16px",
    backgroundRepeat: "repeat-x",
    backgroundSize: "cover",
    backgroundPosition: "50% 50%",
    cursor: "grab",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    transition: "opacity 0.3s",
    overflow: "hidden",
    "&:active": {
      cursor: "grabbing"
    }
  },
  
  loadingOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.8)",
    gap: "10px",
    color: "#666"
  },
  
  panoramaHint: {
    background: "rgba(0,0,0,0.7)",
    color: "white",
    padding: "8px 16px",
    borderRadius: "20px",
    marginBottom: "20px",
    fontSize: "14px",
    textAlign: "center",
    backdropFilter: "blur(10px)"
  },
  
  panoramaFallback: {
    padding: "24px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    textAlign: "center",
    boxShadow: "0 8px 32px rgba(102, 126, 234, 0.3)"
  },
  
  videoWrapper: {
    width: "100%",
    maxWidth: "900px",
    margin: "20px 0",
    borderRadius: "16px",
    overflow: "hidden",
    background: "#000",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
  },
  
  video: {
    width: "100%",
    height: "auto",
    maxHeight: "70vh",
    display: "block"
  },
  
  mapWrap: {
    marginTop: "8px",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)"
  },
  
  mapIframe: {
    border: "none",
    display: "block"
  },
  
  mapActionsRow: {
    display: "flex",
    gap: "12px",
    marginTop: "16px",
    flexWrap: "wrap"
  },
  
  description: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
  },
  
  descriptionText: {
    lineHeight: 1.7,
    fontSize: "16px",
    color: "#333",
    margin: 0
  },
  
  noDescription: {
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    padding: "20px"
  },
  
  emiWrap: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)"
  },
  
  emiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
    marginBottom: "24px"
  },
  
  emiInputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  
  emiLabel: {
    color: "#444",
    fontWeight: 600,
    fontSize: "14px",
    marginBottom: "4px"
  },
  
  inputWithUnit: {
    display: "flex",
    alignItems: "center",
    border: "1px solid #ddd",
    borderRadius: "8px",
    overflow: "hidden",
    background: "white"
  },
  
  unit: {
    padding: "0 12px",
    background: "#f8f9fa",
    color: "#666",
    fontSize: "14px",
    height: "100%",
    display: "flex",
    alignItems: "center"
  },
  
  emiInput: {
    flex: 1,
    padding: "12px",
    border: "none",
    outline: "none",
    fontSize: "16px",
    "&:focus": {
      background: "#f8f9fa"
    }
  },
  
  helperText: {
    fontSize: "12px",
    color: "#666",
    marginTop: "4px"
  },
  
  emiResult: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "24px"
  },
  
  emiResultCard: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: "20px",
    borderRadius: "12px",
    textAlign: "center"
  },
  
  emiResultLabel: {
    fontSize: "14px",
    opacity: 0.9,
    marginBottom: "8px"
  },
  
  emiResultValue: {
    fontSize: "22px",
    fontWeight: 800
  },
  
  amortPreview: {
    marginTop: "24px",
    paddingTop: "24px",
    borderTop: "1px solid #eee"
  },
  
  amortTitle: {
    fontWeight: 700,
    marginBottom: "16px",
    color: "#0a2540",
    fontSize: "16px"
  },
  
  amortTable: {
    background: "#f8f9fa",
    borderRadius: "12px",
    overflow: "hidden"
  },
  
  amortHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    background: "#0066ff",
    color: "white",
    padding: "12px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase"
  },
  
  amortRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    padding: "12px",
    borderBottom: "1px solid #eee",
    "&:nth-child(even)": {
      background: "rgba(255,255,255,0.5)"
    }
  },
  
  amortCell: {
    fontSize: "14px",
    color: "#333"
  },
  
  factsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "16px",
    marginTop: "8px"
  },
  
  factBox: {
    background: "white",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    transition: "transform 0.2s",
    "&:hover": {
      transform: "translateY(-2px)"
    }
  },
  
  factLabel: {
    color: "#666",
    fontSize: "13px",
    marginBottom: "8px"
  },
  
  factValue: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0a2540"
  },
  
  amenitiesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "12px",
    marginTop: "16px"
  },
  
  amenityItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  },
  
  amenityIcon: {
    color: "#4caf50",
    fontWeight: "bold"
  },
  
  relatedRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
    marginTop: "8px"
  },
  
  relatedCard: {
    background: "white",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    cursor: "pointer",
    transition: "all 0.3s",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: "0 12px 40px rgba(0,0,0,0.15)"
    }
  },
  
  relatedImageContainer: {
    position: "relative",
    height: "200px",
    overflow: "hidden"
  },
  
  relatedImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.3s"
  },
  
  relatedOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    opacity: 0,
    transition: "opacity 0.3s",
    "&:hover": {
      opacity: 1
    }
  },
  
  relatedContent: {
    padding: "20px"
  },
  
  relatedTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0a2540",
    marginBottom: "8px",
    lineHeight: 1.3
  },
  
  relatedPrice: {
    color: "#d32f2f",
    fontSize: "20px",
    fontWeight: 800,
    marginBottom: "8px"
  },
  
  relatedLoc: {
    color: "#666",
    fontSize: "14px",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  
  relatedSpecs: {
    display: "flex",
    gap: "8px",
    fontSize: "13px",
    color: "#888",
    marginTop: "8px"
  },
  
  agentCard: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    marginBottom: "24px",
    boxShadow: "0 6px 24px rgba(0,0,0,0.1)"
  },
  
  agentTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#0a2540",
    marginBottom: "20px"
  },
  
  agentInfo: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    marginBottom: "20px"
  },
  
  agentAvatar: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: "bold"
  },
  
  agentName: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#0a2540",
    margin: "0 0 4px 0"
  },
  
  agentEmail: {
    color: "#666",
    fontSize: "14px",
    margin: "0 0 4px 0"
  },
  
  agentPhone: {
    color: "#0066ff",
    fontSize: "14px",
    fontWeight: 600,
    margin: "0 0 4px 0"
  },
  
  agentCompany: {
    color: "#888",
    fontSize: "13px",
    margin: "0"
  },
  
  agentBio: {
    fontSize: "14px",
    color: "#666",
    lineHeight: 1.6,
    borderTop: "1px solid #eee",
    paddingTop: "20px",
    margin: "20px 0 0 0"
  },
  
  formCard: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 6px 24px rgba(0,0,0,0.1)",
    marginBottom: "24px"
  },
  
  formTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#0a2540",
    marginBottom: "8px"
  },
  
  formSubtitle: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "24px"
  },
  
  formGroup: {
    marginBottom: "16px"
  },
  
  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "16px",
    transition: "all 0.2s",
    "&:focus": {
      outline: "none",
      borderColor: "#0066ff",
      boxShadow: "0 0 0 3px rgba(0,102,255,0.1)"
    },
    "&:disabled": {
      background: "#f8f9fa",
      cursor: "not-allowed"
    }
  },
  
  textarea: {
    width: "100%",
    padding: "14px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "16px",
    resize: "vertical",
    minHeight: "100px",
    transition: "all 0.2s",
    "&:focus": {
      outline: "none",
      borderColor: "#0066ff",
      boxShadow: "0 0 0 3px rgba(0,102,255,0.1)"
    },
    "&:disabled": {
      background: "#f8f9fa",
      cursor: "not-allowed"
    }
  },
  
  btn: {
    width: "100%",
    padding: "16px",
    background: "linear-gradient(135deg, #0066ff 0%, #0052cc 100%)",
    color: "white",
    border: "none",
    fontWeight: 700,
    fontSize: "16px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: "0 8px 20px rgba(0,102,255,0.3)"
    },
    "&:disabled": {
      opacity: 0.7,
      cursor: "not-allowed",
      transform: "none"
    }
  },
  
  buttonSpinner: {
    width: "20px",
    height: "20px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid white",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  
  msg: {
    marginTop: "16px",
    textAlign: "center",
    fontSize: "14px",
    padding: "12px",
    borderRadius: "8px",
    background: "#f8f9fa"
  },
  
  privacyNote: {
    fontSize: "12px",
    color: "#888",
    textAlign: "center",
    marginTop: "16px",
    lineHeight: 1.5
  },
  
  quickActions: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  
  actionButton: {
    padding: "14px",
    background: "white",
    border: "1px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: 600,
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    "&:hover": {
      background: "#f8f9fa",
      borderColor: "#0066ff",
      color: "#0066ff",
      transform: "translateY(-1px)"
    }
  },
  
  secondaryButton: {
    padding: "12px 20px",
    background: "white",
    border: "1px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    transition: "all 0.2s",
    "&:hover": {
      background: "#f8f9fa",
      borderColor: "#0066ff",
      color: "#0066ff"
    }
  }
};

/* ================= Lightbox styles ================= */
const lightboxStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.95)",
    zIndex: 9999,
    animation: "fadeIn 0.2s ease-out"
  },
  
  container: {
    position: "relative",
    width: "90vw",
    height: "90vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  
  content: {
    position: "relative",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  
  image: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    borderRadius: "4px"
  },
  
  caption: {
    position: "absolute",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.7)",
    color: "white",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "14px",
    backdropFilter: "blur(10px)"
  },
  
  close: {
    position: "absolute",
    top: "20px",
    right: "20px",
    fontSize: "32px",
    color: "#fff",
    background: "rgba(0,0,0,0.5)",
    border: "none",
    cursor: "pointer",
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    zIndex: 10000,
    "&:hover": {
      background: "rgba(0,0,0,0.8)",
      transform: "scale(1.1)"
    }
  },
  
  navButton: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    left: "20px",
    fontSize: "60px",
    color: "rgba(255,255,255,0.8)",
    background: "rgba(0,0,0,0.5)",
    border: "none",
    cursor: "pointer",
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    zIndex: 10000,
    "&:hover": {
      background: "rgba(0,0,0,0.8)",
      color: "white",
      transform: "translateY(-50%) scale(1.1)"
    }
  },
  
  thumbnails: {
    position: "absolute",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "10px",
    padding: "10px",
    background: "rgba(0,0,0,0.5)",
    borderRadius: "12px",
    backdropFilter: "blur(10px)",
    maxWidth: "90%",
    overflowX: "auto"
  },
  
  thumbnail: {
    width: "60px",
    height: "45px",
    objectFit: "cover",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
    "&:hover": {
      opacity: 1,
      transform: "scale(1.1)"
    }
  }
};