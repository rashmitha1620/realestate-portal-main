// client/src/pages/Home.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { fixMediaUrl } from "../utils/fixMediaUrl";

export default function Home() {
  const [properties, setProperties] = useState([]);
  const [city, setCity] = useState("All");
  const [area, setArea] = useState("All");
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [type, setType] = useState("");
  const [listingType, setListingType] = useState("");
  const [budget, setBudget] = useState("");
  const [keyword, setKeyword] = useState("");
  const [services, setServices] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [popularLocalities, setPopularLocalities] = useState([]);
  const [nearbyLocalities, setNearbyLocalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState([]);
  
  // Renew Subscription State
  const [showRenewButton, setShowRenewButton] = useState(true);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    active: false,
    expiresIn: 0,
    plan: "Free"
  });

  const suggestTimer = useRef(null);
  
  const slideImages = [
    "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1612637968894-660373e23b03?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1475855581690-80accde3ae2b?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80"
  ];
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideIntervalRef = useRef(null);
  const parallaxRef = useRef(0);
  const servicesSliderRef = useRef(null);
  const servicesIntervalRef = useRef(null);
  const statsRef = useRef({ views: 1248, saved: 342, inquiries: 89 });
  const lastScrollY = useRef(0);
  const searchBarRef = useRef(null);
  const floatingBtnRef = useRef(null);
  const particlesRef = useRef([]);

  const navigate = useNavigate();

  /* ------------------ Particle Animation ------------------ */
  useEffect(() => {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particlesRef.current = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speedX: Math.random() * 0.5 - 0.25,
      speedY: Math.random() * 0.5 - 0.25,
      color: `rgba(102, 126, 234, ${Math.random() * 0.3 + 0.1})`
    }));

    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current.forEach(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.y > canvas.height) particle.y = 0;
        if (particle.y < 0) particle.y = canvas.height;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
        
        // Draw connections
        particlesRef.current.forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(102, 126, 234, ${0.1 * (1 - distance/100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
      });
      
      requestAnimationFrame(animateParticles);
    };

    animateParticles();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ------------------ Check Subscription Status ------------------ */
  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const response = await api.get('/subscription/status');
      setSubscriptionStatus(response.data);
      
      // Show renew button if subscription is expired or about to expire
      if (!response.data.active || response.data.expiresIn <= 7) {
        setShowRenewButton(true);
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const handleRenewSubscription = () => {
    setShowRenewModal(true);
  };

  const renewSubscription = async (plan) => {
    try {
      const response = await api.post('/subscription/renew', { plan });
      if (response.data.success) {
        alert('Subscription renewed successfully!');
        setShowRenewModal(false);
        checkSubscriptionStatus();
      }
    } catch (error) {
      console.error('Error renewing subscription:', error);
      alert('Failed to renew subscription. Please try again.');
    }
  };

  /* ------------------ initial load ------------------ */
  useEffect(() => {
    loadProperties();
    loadCities();
    loadServices();
    updateActiveFilterCount();
  }, [city, area, type, listingType, budget, keyword]);

  useEffect(() => {
    startSlideRotation();
    
    const onScroll = () => {
      parallaxRef.current = window.scrollY;
      
      // Sticky search bar effect
      if (searchBarRef.current) {
        const searchBar = searchBarRef.current;
        const scrollTop = window.scrollY;
        
        if (scrollTop > 300) {
          searchBar.style.transform = "translateY(0)";
          searchBar.style.opacity = "1";
          searchBar.style.boxShadow = "0 10px 40px rgba(0,0,0,0.15)";
          searchBar.style.backdropFilter = "blur(10px)";
        } else {
          searchBar.style.transform = "translateY(-10px)";
          searchBar.style.opacity = "0.95";
          searchBar.style.boxShadow = "0 20px 50px rgba(10,20,40,0.12)";
          searchBar.style.backdropFilter = "blur(5px)";
        }
      }

      // Floating button position
      if (floatingBtnRef.current) {
        if (scrollTop > 500) {
          floatingBtnRef.current.style.opacity = "1";
          floatingBtnRef.current.style.transform = "translateY(0)";
        } else {
          floatingBtnRef.current.style.opacity = "0";
          floatingBtnRef.current.style.transform = "translateY(20px)";
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    let rafId = null;
    const renderParallax = () => {
      const root = document.documentElement;
      root.style.setProperty("--hero-scroll-y", `${parallaxRef.current}`);
      rafId = requestAnimationFrame(renderParallax);
    };
    rafId = requestAnimationFrame(renderParallax);

    return () => {
      stopSlideRotation();
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  /* ------------------ Services Auto Scroll ------------------ */
  useEffect(() => {
    if (!services.length) return;

    const startAutoScroll = () => {
      servicesIntervalRef.current = setInterval(() => {
        if (servicesSliderRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = servicesSliderRef.current;
          
          if (scrollLeft + clientWidth >= scrollWidth - 10) {
            servicesSliderRef.current.scrollTo({
              left: 0,
              behavior: "smooth"
            });
          } else {
            servicesSliderRef.current.scrollBy({
              left: 1,
              behavior: "auto"
            });
          }
        }
      }, 30);
    };

    startAutoScroll();

    return () => {
      if (servicesIntervalRef.current) {
        clearInterval(servicesIntervalRef.current);
        servicesIntervalRef.current = null;
      }
    };
  }, [services]);

  const startSlideRotation = () => {
    stopSlideRotation();
    slideIntervalRef.current = setInterval(() => {
      setCurrentSlide((s) => (s + 1) % slideImages.length);
    }, 5000);
  };

  const stopSlideRotation = () => {
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current);
      slideIntervalRef.current = null;
    }
  };

  const loadProperties = async () => {
    try {
      setLoading(true);
      const res = await api.get("/properties");
      const data = res.data || [];
      setProperties(data);
      computePopularLocalities(data);
    } catch (err) {
      console.error("Failed to load properties", err);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async () => {
    try {
      const res = await api.get("/properties/filters/cities");
      setCities(res.data || []);
    } catch (err) {
      console.error("Failed to load cities", err);
      setCities([]);
    }
  };

  const loadServices = async () => {
    try {
      const res = await api.get("/company-banners");
      const sorted = (res.data || []).sort((a, b) => a.priority - b.priority);
      
      const transformedServices = sorted.map(banner => ({
        _id: banner._id,
        companyName: banner.companyName,
        serviceType: banner.serviceCategory || "Service",
        description: banner.description || banner.tagline || `${banner.companyName} - ${banner.serviceCategory || 'Real Estate Service'}`,
        servicesOffered: banner.services ? banner.services.join(", ") : banner.serviceCategory,
        contact: banner.phone || "Contact for details",
        image: banner.image ? fixMediaUrl(banner.image) : "/no-image.png",
        serviceCategory: banner.serviceCategory,
        operatingCities: banner.operatingCities
      }));
      
      setServices(transformedServices);
    } catch (err) {
      console.error("Failed to load company banners, using mock data", err);
      
      const mockServices = [
        {
          _id: "1",
          companyName: "Skyline Builders",
          serviceType: "Construction",
          description: "Leading construction company with 20+ years experience",
          servicesOffered: "Construction, Renovation, Planning",
          contact: "+91 9876543210",
          image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=600&q=80"
        },
        {
          _id: "2",
          companyName: "Urban Interiors",
          serviceType: "Interior Design",
          description: "Modern interior design for homes and offices",
          servicesOffered: "Interior Design, Furniture, Space Planning",
          contact: "+91 9876543211",
          image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80"
        },
        {
          _id: "3",
          companyName: "Secure Homes",
          serviceType: "Security",
          description: "Complete home security solutions",
          servicesOffered: "CCTV, Alarm Systems, Security Guards",
          contact: "+91 9876543212",
          image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80"
        },
        {
          _id: "4",
          companyName: "Green Gardens",
          serviceType: "Landscaping",
          description: "Professional landscaping and gardening services",
          servicesOffered: "Landscape Design, Garden Maintenance, Irrigation",
          contact: "+91 9876543213",
          image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80"
        },
        {
          _id: "5",
          companyName: "Smart Electric",
          serviceType: "Electrical",
          description: "Licensed electricians for all electrical needs",
          servicesOffered: "Wiring, Repairs, Installations",
          contact: "+91 9876543214",
          image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=600&q=80"
        },
        {
          _id: "6",
          companyName: "Aqua Flow",
          serviceType: "Plumbing",
          description: "24/7 emergency plumbing services",
          servicesOffered: "Leak Repair, Pipe Installation, Maintenance",
          contact: "+91 9876543215",
          image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?auto=format&fit=crop&w=600&q=80"
        }
      ];
      
      setServices(mockServices);
    }
  };

  useEffect(() => {
    if (city === "All") {
      setAreas([]);
      setArea("All");
    } else {
      loadAreasByCity(city);
    }
  }, [city]);

  const loadAreasByCity = async (selectedCity) => {
    try {
      const res = await api.get("/properties/filters/areas", {
        params: { city: selectedCity },
      });
      setAreas(res.data || []);
    } catch (err) {
      console.error("Failed to load areas for", selectedCity, err);
      setAreas([]);
    }
  };

  const computePopularLocalities = (props) => {
    const map = {};
    const cityCount = {};
    (props || []).forEach((p) => {
      const c = (p.city || "").trim();
      const a = (p.areaName || "").trim();
      if (c && a) {
        const key = `${c}|||${a}`;
        map[key] = (map[key] || 0) + 1;
        cityCount[c] = (cityCount[c] || 0) + 1;
      }
    });

    const entries = Object.entries(map).map(([k, v]) => {
      const [c, a] = k.split("|||");
      return { city: c, area: a, count: v };
    });

    entries.sort((x, y) => y.count - x.count);
    setPopularLocalities(entries.slice(0, 20));
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        computeNearbyLocalities(latitude, longitude);
      },
      (err) => {},
      { maximumAge: 1000 * 60 * 60, timeout: 5000 }
    );
  }, [properties]);

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const computeNearbyLocalities = (lat, lng) => {
    const list = [];
    properties.forEach((p) => {
      const loc = p.location;
      if (loc && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
        const [lngP, latP] = loc.coordinates;
        if (latP && lngP) {
          const dist = haversineKm(lat, lng, latP, lngP);
          list.push({
            city: p.city || "Unknown",
            area: p.areaName || p.title || "Unknown",
            distanceKm: dist,
          });
        }
      }
    });

    list.sort((a, b) => a.distanceKm - b.distanceKm);
    const unique = [];
    const seen = new Set();
    for (const it of list) {
      const key = `${it.city}|||${it.area}`;
      if (!seen.has(key)) {
        unique.push(it);
        seen.add(key);
      }
      if (unique.length >= 8) break;
    }
    setNearbyLocalities(unique);
  };

  const fetchSuggestions = (text) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!text || !text.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await api.get("/properties/filters/suggestions", {
          params: { q: text },
        });
        const raw = res.data || [];
        const ranked = rankSuggestions(raw, text);
        setSuggestions(ranked);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Suggestion fetch failed", err);
        setSuggestions([]);
      }
    }, 300);
  };

  const rankSuggestions = (raw, q) => {
    const query = (q || "").toLowerCase().trim();
    const popMap = {};
    popularLocalities.forEach((p) => {
      const k = `${p.city}|||${p.area}`;
      popMap[k] = p.count;
    });

    const normalized = raw
      .map((r) => {
        const v = (r.value || "").toString();
        const t = r.type || "project";
        let score = 0;
        const low = v.toLowerCase();
        if (low === query) score += 100;
        else if (low.startsWith(query)) score += 50;
        else if (low.includes(query)) score += 20;

        if (t === "area" || t === "city") {
          for (const p of popularLocalities) {
            if (t === "area" && p.area.toLowerCase() === low) {
              score += p.count * 2;
              break;
            }
            if (t === "city" && p.city.toLowerCase() === low) {
              score += (p.count || 0);
              break;
            }
          }
        }

        return { type: t, value: v, score };
      })
      .reduce(
        (acc, cur) => {
          const key = `${cur.type}|||${cur.value}`;
          if (!acc.map[key]) {
            acc.map[key] = cur;
            acc.order.push(cur);
          } else {
            if (cur.score > acc.map[key].score) acc.map[key] = cur;
          }
          return acc;
        },
        { map: {}, order: [] }
      ).order;

    const near = nearbyLocalities.map((n) => ({
      type: "area",
      value: `${n.area}, ${n.city}`,
      score: 40 - n.distanceKm,
    }));

    const popular = popularLocalities.slice(0, 15).map((p) => ({
      type: "area",
      value: `${p.area}, ${p.city}`,
      score: 10 + p.count,
    }));

    const combined = [...normalized, ...near, ...popular];

    const uniq = {};
    combined.forEach((it) => {
      const k = it.value.toLowerCase();
      if (!uniq[k] || it.score > uniq[k].score) uniq[k] = it;
    });

    return Object.values(uniq)
      .sort((a, b) => b.score - a.score)
      .slice(0, 25)
      .map((it) => ({ type: it.type, value: it.value }));
  };

  const clearFilters = () => {
    setCity("All");
    setArea("All");
    setType("");
    setListingType("");
    setBudget("");
    setKeyword("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedPropertyTypes([]);
  };

  const updateActiveFilterCount = () => {
    let count = 0;
    if (city !== "All") count++;
    if (area !== "All") count++;
    if (type) count++;
    if (listingType) count++;
    if (budget) count++;
    if (keyword.trim()) count++;
    setActiveFilterCount(count);
  };

  const propertyTypes = [
    { id: "apartment", label: "Apartment", icon: "🏢" },
    { id: "villa", label: "Villa", icon: "🏡" },
    { id: "plot", label: "Plot", icon: "🗺️" },
    { id: "house", label: "House", icon: "🏠" },
    { id: "commercial", label: "Commercial", icon: "🏢" },
    { id: "farmhouse", label: "Farmhouse", icon: "🌾" }
  ];

  const handlePropertyTypeClick = (typeId) => {
    setSelectedPropertyTypes(prev => {
      if (prev.includes(typeId)) {
        return prev.filter(id => id !== typeId);
      } else {
        return [...prev, typeId];
      }
    });
  };

  const filtered = properties.filter((p) => {
    if (p.active === false) return false;
    if (listingType && p.listingType !== listingType) return false;

    let matchCity = true;
    if (city !== "All") matchCity = (p.city || "").toLowerCase() === city.toLowerCase();

    let matchArea = true;
    if (area !== "All") matchArea = (p.areaName || "").toLowerCase() === area.toLowerCase();

    let matchType = true;
    if (type) matchType = p.propertyType === type;

    let matchBudget = true;
    if (budget) {
      const price = Number(p.price) || 0;
      switch (budget) {
        case "10":
          matchBudget = price <= 1000000;
          break;
        case "20":
          matchBudget = price > 1000000 && price <= 2000000;
          break;
        case "30":
          matchBudget = price > 2000000 && price <= 3000000;
          break;
        case "50":
          matchBudget = price > 3000000 && price <= 5000000;
          break;
        case "75":
          matchBudget = price > 5000000 && price <= 7500000;
          break;
        case "100":
          matchBudget = price > 7500000 && price <= 10000000;
          break;
        case "100plus":
          matchBudget = price > 10000000;
          break;
        default:
          matchBudget = true;
      }
    }

    let matchKeyword = true;
    if (keyword.trim()) {
      const q = keyword.toLowerCase();
      matchKeyword =
        (p.title || "").toLowerCase().includes(q) ||
        (p.projectName || "").toLowerCase().includes(q) ||
        (p.areaName || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q);
    }

    return matchCity && matchArea && matchType && matchBudget && matchKeyword;
  });

  // Stats animation
  useEffect(() => {
    const animateStats = () => {
      const incrementStat = (target, current, elementId) => {
        const increment = Math.ceil(target / 100);
        if (current < target) {
          const newValue = Math.min(current + increment, target);
          const element = document.getElementById(elementId);
          if (element) {
            element.textContent = newValue.toLocaleString();
          }
          setTimeout(() => incrementStat(target, newValue, elementId), 20);
        }
      };

      incrementStat(statsRef.current.views, 0, 'stat-views');
      incrementStat(statsRef.current.saved, 0, 'stat-saved');
      incrementStat(statsRef.current.inquiries, 0, 'stat-inquiries');
    };

    const timeoutId = setTimeout(animateStats, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

  /* ------------------ UI ------------------ */
  return (
    <div style={styles.container}>
      {/* Particle Background */}
      <canvas 
        id="particles-canvas" 
        style={styles.particlesCanvas}
      />

      {/* CSS Styles */}
      <style>{`
        :root {
          --hero-scroll-y: 0;
          --hero-parallax-strength: 0.25;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 193, 7, 0.5);
          }
          50% {
            box-shadow: 0 0 40px rgba(255, 193, 7, 0.8);
          }
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .searchBarFlex {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          transition: all 0.3s ease;
        }

        .services-scroll-container {
          overflow: hidden;
          position: relative;
          padding: 10px 0;
        }

        .services-scroll-container::before,
        .services-scroll-container::after {
          content: '';
          position: absolute;
          top: 0;
          width: 60px;
          height: 100%;
          z-index: 2;
          pointer-events: none;
        }

        .services-scroll-container::before {
          left: 0;
          background: linear-gradient(to right, #f7f9fb 0%, transparent 100%);
        }

        .services-scroll-container::after {
          right: 0;
          background: linear-gradient(to left, #f7f9fb 0%, transparent 100%);
        }

        .sticky-search-bar {
          transition: all 0.3s ease;
        }

        .property-type-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .property-type-card:hover {
          transform: translateY(-8px) scale(1.05);
        }

        .property-type-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: 0.5s;
        }

        .property-type-card:hover::before {
          left: 100%;
        }

        .service-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .service-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .property-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .property-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .property-card:hover .property-image {
          transform: scale(1.1);
        }

        .property-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.7) 100%);
          opacity: 0;
          transition: opacity 0.3s;
          border-radius: 16px;
          pointer-events: none;
        }

        .property-card:hover::after {
          opacity: 1;
        }

        .stats-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          animation: float 6s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }

        .stats-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 20px 20px;
          animation: rotate 20s linear infinite;
          opacity: 0.2;
        }

        .gradient-text {
          background: linear-gradient(90deg, #667eea, #764ba2, #667eea);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }

        .glow-text {
          text-shadow: 0 0 10px rgba(255, 193, 7, 0.7),
                       0 0 20px rgba(255, 193, 7, 0.5),
                       0 0 30px rgba(255, 193, 7, 0.3);
        }

        .floating-button {
          animation: bounce 2s ease-in-out infinite;
        }

        @media (max-width: 920px) {
          .searchBarFlex {
            gap: 8px;
          }
          .searchItemBox {
            min-width: 110px;
            padding: 8px 10px;
          }
          .mobile-filters {
            display: flex !important;
          }
          .desktop-filters {
            display: none !important;
          }
        }

        @media (max-width: 820px) {
          .searchBarFlex {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 12px !important;
            border-radius: 12px !important;
          }
          .searchItemBox {
            width: 100% !important;
            margin-bottom: 8px !important;
            display: flex;
            align-items: center;
          }
          .searchInputBox {
            width: 100% !important;
            margin-bottom: 8px !important;
          }
          .property-types-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 480px) {
          .property-types-grid {
            grid-template-columns: 1fr !important;
          }
          .stats-grid {
            grid-template-columns: 1fr !important;
            gap: 15px !important;
          }
        }

        .glass-effect {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .loading-skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .blur-backdrop {
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
      `}</style>

      {/* Floating Renew Button */}
      {showRenewButton && (
        <div ref={floatingBtnRef} style={styles.floatingRenewButton} className="floating-button">
          <button 
            style={styles.renewButton}
            onClick={handleRenewSubscription}
            title="Renew your subscription"
          >
            <span style={styles.renewIcon}>🔄</span>
            <span style={styles.renewText}>
              {subscriptionStatus.active ? 'Upgrade Plan' : 'Renew Subscription'}
            </span>
            {!subscriptionStatus.active && (
              <span style={styles.renewBadge}>!</span>
            )}
          </button>
        </div>
      )}

      {/* Renew Subscription Modal */}
     {/* Floating Renew Button */}
{showRenewButton && (
  <div ref={floatingBtnRef} style={styles.floatingRenewButton}>
    <button 
      style={styles.renewButton}
      onClick={() => navigate('/renew')} // Changed from handleRenewSubscription
      title="Renew your subscription"
    >
      <span style={styles.renewIcon}>🔄</span>
      <span style={styles.renewText}>
        {subscriptionStatus.active ? 'Upgrade Plan' : 'Renew Subscription'}
      </span>
      {!subscriptionStatus.active && (
        <span style={styles.renewBadge}>!</span>
      )}
    </button>
  </div>
)}

      {/* ===== HERO SECTION ===== */}
      <section style={styles.heroWrap}>
        <div style={styles.slidesWrap}>
          {slideImages.map((img, idx) => {
            const active = idx === currentSlide;
            return (
              <div
                key={idx}
                aria-hidden={!active}
                style={{
                  ...styles.slide,
                  backgroundImage: `url("${img}")`,
                  opacity: active ? 1 : 0,
                  transform: active ? "scale(1)" : "scale(1.03)",
                  zIndex: active ? 1 : 0,
                }}
              />
            );
          })}
          <div style={styles.heroDarkOverlay} />
          {/* Slide indicators */}
          <div style={styles.slideIndicators}>
            {slideImages.map((_, idx) => (
              <button
                key={idx}
                style={{
                  ...styles.slideIndicator,
                  background: idx === currentSlide ? "#fff" : "rgba(255,255,255,0.3)",
                  width: idx === currentSlide ? "24px" : "8px",
                }}
                onClick={() => {
                  setCurrentSlide(idx);
                  startSlideRotation();
                }}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        <div style={styles.heroInner}>
          <h1 style={styles.heroTitle}>
            <span className="gradient-text glow-text">Find Your Dream Property</span>
            <br />
            In The Perfect Location
          </h1>
          <p style={styles.heroDesc}>
            Discover trusted properties, trending locations, and personalized recommendations
          </p>

          <div style={styles.heroStats}>
            <div style={styles.statItem}>
              <div style={styles.statNumber} id="stat-views">0</div>
              <div style={styles.statLabel}>Property Views</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statNumber} id="stat-saved">0</div>
              <div style={styles.statLabel}>Saved Properties</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statNumber} id="stat-inquiries">0</div>
              <div style={styles.statLabel}>Monthly Inquiries</div>
            </div>
          </div>
        </div>

        {/* Floating Search Bar */}
        <div ref={searchBarRef} style={styles.floatingSearchWrapper} className="sticky-search-bar">
          <div style={styles.searchBar} className="searchBarFlex blur-backdrop">
            {/* Active Filters Badge */}
            {activeFilterCount > 0 && (
              <div style={styles.activeFilterBadge}>
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
              </div>
            )}

            <div style={styles.searchItem} className="searchItemBox">
              <span style={styles.icon}>📍</span>
              <select style={styles.select} value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="All">All Cities</option>
                {cities.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {city !== "All" && (
              <div style={styles.searchItem} className="searchItemBox">
                <span style={styles.icon}>📌</span>
                <select style={styles.select} value={area} onChange={(e) => setArea(e.target.value)}>
                  <option value="All">All Areas</option>
                  {areas.map((a, i) => (
                    <option key={i} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.searchItem} className="searchItemBox">
              <span style={styles.icon}>🏠</span>
              <select style={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Property Type</option>
                <option value="Apartment">Apartment</option>
                <option value="Villa">Villa</option>
                <option value="Open Plot">Plot</option>
                <option value="Independent House">Independent House</option>
              </select>   
            </div>

            <div style={styles.searchItem} className="searchItemBox">
              <span style={styles.icon}>📄</span>
              <select
                style={styles.select}
                value={listingType}
                onChange={(e) => setListingType(e.target.value)}
              >
                <option value="">All Listings</option>
                <option value="Sell">Sell</option>
                <option value="Rent">Rent</option>
                <option value="Lease">Lease</option>
                <option value="PG">PG</option>
                <option value="Farm Lease">Farm Lease</option>
              </select>
            </div>

            <div style={styles.searchItem} className="searchItemBox">
              <span style={styles.icon}>💰</span>
              <select style={styles.select} value={budget} onChange={(e) => setBudget(e.target.value)}>
                <option value="">Budget</option>
                <option value="10">Below ₹10 Lakh</option>
                <option value="20">₹10–20 Lakh</option>
                <option value="30">₹20–30 Lakh</option>
                <option value="50">₹30–50 Lakh</option>
                <option value="75">₹50–75 Lakh</option>
                <option value="100">₹75 Lakh – ₹1 Cr</option>
                <option value="100plus">Above ₹1 Crore</option>
              </select>
            </div>

            <div style={styles.searchInputWrap} className="searchInputBox">
              <input
                style={styles.searchInput}
                placeholder="Search city / area / project / landmark…"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  fetchSuggestions(e.target.value);
                }}
                onFocus={() => {
                  if (keyword.trim()) setShowSuggestions(true);
                }}
              />
              {keyword && (
                <button
                  style={styles.clearSearchBtn}
                  onClick={() => setKeyword("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ minWidth: 120, display: "flex", gap: "8px" }}>
              <button
                style={styles.searchBtn}
                onClick={() => setShowSuggestions(false)}
              >
                🔍 Search
              </button>
              {activeFilterCount > 0 && (
                <button
                  style={styles.clearBtn}
                  onClick={clearFilters}
                  title="Clear all filters"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div style={styles.suggestionBox}>
              <div style={styles.suggestionHeader}>
                <span>Suggestions</span>
                <button onClick={() => setShowSuggestions(false)}>✕</button>
              </div>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  style={styles.suggestionItem}
                  onClick={() => {
                    const v = s.value;
                    if (v.includes(",")) {
                      const [areaName, cityName] = v.split(",").map((x) => x.trim());
                      setCity(cityName);
                      setArea(areaName);
                    } else {
                      setKeyword(v);
                    }
                    setShowSuggestions(false);
                  }}
                >
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <span style={{ fontWeight: 700 }}>{s.value}</span>
                    <span style={styles.suggestionType}>({s.type})</span>
                  </div>
                  <div style={styles.suggestionArrow}>→</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== PROPERTY TYPES SECTION ===== */}
      <section style={styles.propertyTypesSection}>
        <h2 style={styles.sectionTitle}>Browse By Property Type</h2>
        <p style={styles.sectionSubtitle}>
          Find the perfect property that matches your lifestyle
        </p>
        
        <div style={styles.propertyTypesGrid} className="property-types-grid">
          {propertyTypes.map((propType) => (
            <div
              key={propType.id}
              style={{
                ...styles.propertyTypeCard,
                border: selectedPropertyTypes.includes(propType.id) 
                  ? "2px solid #667eea" 
                  : "2px solid #e6e9ef",
                background: selectedPropertyTypes.includes(propType.id)
                  ? "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)"
                  : "#fff"
              }}
              className="property-type-card"
              onClick={() => handlePropertyTypeClick(propType.id)}
            >
              <div style={styles.propertyTypeIcon}>{propType.icon}</div>
              <h3 style={styles.propertyTypeTitle}>{propType.label}</h3>
              <p style={styles.propertyTypeCount}>
                {properties.filter(p => p.propertyType?.toLowerCase().includes(propType.id)).length} properties
              </p>
              {selectedPropertyTypes.includes(propType.id) && (
                <div style={styles.selectedBadge}>✓ Selected</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== SERVICES SECTION ===== */}
      {services.length > 0 && (
        <section id="services-section" style={styles.servicesSection}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Our Trusted Services & Partners</h2>
              <p style={styles.sectionSubtitle}>
                Premium services to help you with every aspect of real estate
              </p>
            </div>
            <button
              style={styles.viewAllBtn}
              onClick={() => navigate('/services')}
            >
              View All Services →
            </button>
          </div>
          
          <div className="services-scroll-container">
            <div
              ref={servicesSliderRef}
              style={styles.servicesRow}
              onMouseEnter={() => {
                if (servicesIntervalRef.current) {
                  clearInterval(servicesIntervalRef.current);
                  servicesIntervalRef.current = null;
                }
              }}
              onMouseLeave={() => {
                if (services.length && !servicesIntervalRef.current) {
                  servicesIntervalRef.current = setInterval(() => {
                    if (servicesSliderRef.current) {
                      const { scrollLeft, scrollWidth, clientWidth } = servicesSliderRef.current;
                      
                      if (scrollLeft + clientWidth >= scrollWidth - 10) {
                        servicesSliderRef.current.scrollTo({
                          left: 0,
                          behavior: "smooth"
                        });
                      } else {
                        servicesSliderRef.current.scrollBy({
                          left: 1,
                          behavior: "auto"
                        });
                      }
                    }
                  }, 30);
                }
              }}
            >
              {[...services, ...services].map((service, index) => (
                <div 
                  key={`${service._id}-${index}`} 
                  style={styles.serviceCard}
                  className="service-card"
                >
                  <div style={styles.serviceImage}>
                    <img
                      src={service.image}
                      alt={service.companyName}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.target.src = "/no-image.png";
                      }}
                    />
                    <div style={styles.serviceTypeBadge}>
                      {service.serviceType || "Service"}
                    </div>
                  </div>
                  
                  <div style={styles.serviceContent}>
                    <h3 style={styles.serviceTitle}>
                      {service.companyName}
                    </h3>
                    
                    <p style={styles.serviceDescription}>
                      {service.description?.length > 80 
                        ? `${service.description.substring(0, 80)}...` 
                        : service.description}
                    </p>
                    
                    <div style={styles.serviceDetails}>
                      <div style={styles.serviceDetailItem}>
                        <span style={styles.detailIcon}>📞</span>
                        <span>{service.contact}</span>
                      </div>
                      
                      {service.servicesOffered && (
                        <div style={styles.serviceDetailItem}>
                          <span style={styles.detailIcon}>⚙️</span>
                          <span style={styles.servicesList}>
                            {service.servicesOffered}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      style={styles.serviceButton}
                      onClick={() => {
                        alert(`Contact ${service.companyName} at ${service.contact}`);
                      }}
                    >
                      Contact Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== PROPERTIES SECTION ===== */}
      <section id="properties-section" style={styles.propertiesSection}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Featured Properties</h2>
            <div style={styles.filterSummary}>
              Showing <strong>{filtered.length}</strong> of <strong>{properties.length}</strong> properties
              {city !== "All" && <span style={styles.filterTag}>📍 {city}</span>}
              {area !== "All" && <span style={styles.filterTag}>📌 {area}</span>}
              {type && <span style={styles.filterTag}>🏠 {type}</span>}
              {listingType && <span style={styles.filterTag}>📄 {listingType}</span>}
              {budget && <span style={styles.filterTag}>💰 {budget}</span>}
            </div>
          </div>
          
          <div style={styles.filterActions}>
            {(city !== "All" || area !== "All" || type || listingType || budget || keyword) && (
              <button 
                style={styles.clearFilterBtn}
                onClick={clearFilters}
              >
                ✕ Clear All Filters
              </button>
            )}
            <button 
              style={styles.mobileFilterBtn}
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="mobile-filters"
            >
              🔧 Filters
            </button>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingGrid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={styles.loadingCard}>
                <div style={styles.loadingImage} className="loading-skeleton" />
                <div style={styles.loadingContent}>
                  <div style={styles.loadingTitle} className="loading-skeleton" />
                  <div style={styles.loadingMeta} className="loading-skeleton" />
                  <div style={styles.loadingPrice} className="loading-skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={styles.noResults}>
            <div style={styles.noResultsIcon}>🏠</div>
            <h3 style={styles.noResultsTitle}>No properties found</h3>
            <p style={styles.noResultsText}>
              Try adjusting your search criteria or clear filters
            </p>
            <button 
              style={styles.noResultsBtn}
              onClick={clearFilters}
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
            {filtered.map((p) => (
              <div 
                key={p._id} 
                style={styles.card} 
                className="property-card"
                onClick={() => navigate(`/property/${p._id}`)}
              >
                <div style={styles.cardImage}>
                  <div className="property-image" style={styles.propertyImage}>
                    <img
                      src={p.images?.[0] ? fixMediaUrl(p.images[0]) : "/no-image.png"}
                      alt={p.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.target.src = "/no-image.png";
                      }}
                    />
                  </div>
                  {p.listingType && (
                    <div style={styles.listingBadge}>
                      {p.listingType}
                    </div>
                  )}
                  {p.isVerified && (
                    <div style={styles.verifiedBadge}>✓ Verified</div>
                  )}
                  <div style={styles.imageOverlay}>
                    <span>View Details</span>
                  </div>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>{p.title}</h3>
                    <div style={styles.cardRating}>
                      ⭐ {p.rating || "4.5"}
                    </div>
                  </div>
                  
                  <div style={styles.metaRow}>
                    <div style={styles.meta}>
                      <span style={styles.metaIcon}>📍</span>
                      <span style={styles.metaText}>{p.areaName || "Unknown"}</span>
                    </div>
                    <div style={styles.meta}>
                      <span style={styles.metaIcon}>🏙️</span>
                      <span style={styles.metaText}>{p.city || ""}</span>
                    </div>
                  </div>
                  
                  {p.propertyType && (
                    <div style={styles.propertyTypeTag}>
                      {p.propertyType}
                    </div>
                  )}
                  
                  {p.description && (
                    <p style={styles.cardDescription}>
                      {p.description.length > 100 
                        ? `${p.description.substring(0, 100)}...` 
                        : p.description}
                    </p>
                  )}
                  
                  <div style={styles.cardFooter}>
                    <div style={styles.price}>
                      <div style={styles.priceLabel}>Starting from</div>
                      <div style={styles.priceAmount}>
                        ₹ {Number(p.price || 0).toLocaleString("en-IN")}
                        {p.listingType === "Rent" && <span style={styles.rentPeriod}> / month</span>}
                      </div>
                    </div>
                    <button 
                      style={styles.detailBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/property/${p._id}`);
                      }}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== STATS SECTION ===== */}
      <section style={styles.statsSection}>
        <h2 style={styles.sectionTitle}>Why Choose Us?</h2>
        <p style={styles.sectionSubtitle}>
          Join thousands of satisfied customers who found their dream properties with us
        </p>
        
        <div style={styles.statsGrid} className="stats-grid">
          <div style={styles.statCard} className="stats-card">
            <div style={styles.statIcon}>🏆</div>
            <div style={styles.statNumber}>10,000+</div>
            <div style={styles.statLabel}>Happy Customers</div>
          </div>
          <div style={styles.statCard} className="stats-card">
            <div style={styles.statIcon}>🔑</div>
            <div style={styles.statNumber}>5,000+</div>
            <div style={styles.statLabel}>Properties Sold</div>
          </div>
          <div style={styles.statCard} className="stats-card">
            <div style={styles.statIcon}>⭐</div>
            <div style={styles.statNumber}>4.8/5</div>
            <div style={styles.statLabel}>Customer Rating</div>
          </div>
          <div style={styles.statCard} className="stats-card">
            <div style={styles.statIcon}>🏙️</div>
            <div style={styles.statNumber}>50+</div>
            <div style={styles.statLabel}>Cities Covered</div>
          </div>
        </div>
      </section>

      {/* ===== MOBILE FILTERS MODAL ===== */}
      {showMobileFilters && (
        <div style={styles.mobileFiltersModal}>
          <div style={styles.mobileFiltersContent}>
            <div style={styles.mobileFiltersHeader}>
              <h3>Filters</h3>
              <button onClick={() => setShowMobileFilters(false)}>✕</button>
            </div>
            <div style={styles.mobileFiltersBody}>
              {/* Add mobile filter options here */}
            </div>
            <div style={styles.mobileFiltersFooter}>
              <button style={styles.applyFiltersBtn}>Apply Filters</button>
              <button style={styles.resetFiltersBtn} onClick={clearFilters}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== STYLES ===================== */
const styles = {
  container: {
    padding: "18px 28px",
    marginTop: "10px",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    background: "linear-gradient(180deg, #f7f9fb 0%, #ffffff 100%)",
    minHeight: "100vh",
    position: "relative",
  },

  particlesCanvas: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 1,
  },

  /* ----- Floating Renew Button ----- */
 floatingRenewButton: {
  position: "fixed",
  top: "120px",
  right: "20px",
  zIndex: 1000,
  display: "block", // Make sure this is "block"
  opacity: 1, // Must be 1
  transform: "translateY(0)", // Must be 0
  transition: "all 0.3s ease",
},

  renewButton: {
    padding: "12px 20px",
    background: "linear-gradient(135deg, #FFC107 0%, #FF9800 100%)",
    color: "#333",
    border: "none",
    borderRadius: "30px",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(255, 152, 0, 0.3)",
    animation: "glow 2s infinite",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    position: "relative",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 8px 25px rgba(255, 152, 0, 0.4)",
      background: "linear-gradient(135deg, #FFD54F 0%, #FFA726 100%)",
    },
  },

  renewIcon: {
    fontSize: "16px",
  },

  renewText: {
    fontWeight: "600",
  },

  renewBadge: {
    position: "absolute",
    top: "-8px",
    right: "-8px",
    background: "#ff5252",
    color: "white",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "bold",
    animation: "pulse 1s infinite",
  },

  /* ----- Renew Modal ----- */
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
    padding: "20px",
  },

  modalContent: {
    background: "white",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "800px",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    animation: "slideInRight 0.3s ease-out",
  },

  modalHeader: {
    padding: "24px 24px 0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: "16px",
  },

  modalTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1f2937",
    margin: 0,
  },

  modalClose: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#6b7280",
    padding: "4px",
    "&:hover": {
      color: "#374151",
    },
  },

  modalBody: {
    padding: "24px",
  },

  currentPlan: {
    marginBottom: "32px",
  },

  currentPlanTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "16px",
  },

  planCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "20px",
    background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
    borderRadius: "12px",
    border: "2px solid #d1d5db",
  },

  planIcon: {
    fontSize: "32px",
    color: "#667eea",
  },

  planDetails: {
    flex: 1,
  },

  planName: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1f2937",
    margin: "0 0 4px 0",
  },

  planStatus: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
  },

  plansGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
    marginBottom: "24px",
  },

  planOption: {
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    padding: "24px",
    transition: "all 0.3s ease",
    "&:hover": {
      borderColor: "#667eea",
      transform: "translateY(-4px)",
      boxShadow: "0 10px 25px rgba(102, 126, 234, 0.1)",
    },
  },

  planOptionHeader: {
    marginBottom: "20px",
    position: "relative",
  },

  planOptionTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1f2937",
    margin: "0 0 8px 0",
  },

  planOptionPrice: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#667eea",
  },

  recommendedBadge: {
    position: "absolute",
    top: "-12px",
    right: "-12px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },

  planFeatures: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 24px 0",
  },

  planFeatures: {
    margin: "0 0 24px 0",
    paddingLeft: "20px",
  },

  planFeatures: {
    "& li": {
      marginBottom: "8px",
      fontSize: "14px",
      color: "#4b5563",
      "&:last-child": {
        marginBottom: 0,
      },
    },
  },

  selectPlanBtn: {
    width: "100%",
    padding: "12px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "16px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 10px 25px rgba(102, 126, 234, 0.3)",
    },
  },

  modalFooter: {
    padding: "16px 24px",
    borderTop: "1px solid #e5e7eb",
    textAlign: "right",
  },

  cancelBtn: {
    padding: "10px 20px",
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    "&:hover": {
      background: "#e5e7eb",
    },
  },

  /* ----- Hero ----- */
  heroWrap: {
    position: "relative",
    height: "520px",
    borderRadius: "16px",
    overflow: "visible",
    marginBottom: "120px",
    animation: "fadeInUp 0.8s ease-out",
    zIndex: 2,
  },

  slidesWrap: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    borderRadius: "16px",
  },

  slide: {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    transition: "opacity 900ms ease, transform 1200ms ease",
    willChange: "opacity, transform",
  },

  slideIndicators: {
    position: "absolute",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "8px",
    zIndex: 5,
  },

  slideIndicator: {
    height: "8px",
    borderRadius: "4px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
    padding: 0,
  },

  heroDarkOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(2,6,23,0.25) 0%, rgba(2,6,23,0.55) 60%, rgba(2,6,23,0.72) 100%)",
    mixBlendMode: "multiply",
    pointerEvents: "none",
  },

  heroInner: {
    position: "relative",
    zIndex: 4,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: "60px",
    paddingLeft: "20px",
    paddingRight: "20px",
    textAlign: "center",
    color: "#fff",
    pointerEvents: "none",
  },

  heroTitle: {
    fontSize: "48px",
    fontWeight: 900,
    margin: 0,
    marginBottom: "16px",
    letterSpacing: "-0.5px",
    color: "#fff",
    textShadow: "0 6px 26px rgba(2,6,23,0.6)",
    pointerEvents: "auto",
    lineHeight: 1.2,
  },

  heroDesc: {
    fontSize: "18px",
    maxWidth: "820px",
    opacity: 0.95,
    margin: 0,
    marginBottom: "30px",
    color: "#f1f5f9",
    pointerEvents: "auto",
  },

  heroStats: {
    display: "flex",
    gap: "40px",
    marginTop: "30px",
    pointerEvents: "auto",
  },

  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  statNumber: {
    fontSize: "32px",
    fontWeight: 800,
    color: "#fff",
    marginBottom: "4px",
    textShadow: "0 2px 10px rgba(0,0,0,0.2)",
  },

  statLabel: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.9)",
    fontWeight: 500,
  },

  heroPrimaryBtn: {
    padding: "14px 32px",
    fontSize: "16px",
    fontWeight: 800,
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(90deg, #ffd34d, #ffb347)",
    color: "#111",
    boxShadow: "0 12px 40px rgba(0,0,0,0.24)",
    pointerEvents: "auto",
    transition: "transform 0.2s, box-shadow 0.2s",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 16px 50px rgba(0,0,0,0.28)",
    },
  },

  heroGhostBtn: {
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: 700,
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.18)",
    cursor: "pointer",
    background: "transparent",
    color: "#fff",
    pointerEvents: "auto",
    transition: "background 0.2s, border-color 0.2s",
    "&:hover": {
      background: "rgba(255,255,255,0.1)",
      borderColor: "rgba(255,255,255,0.3)",
    },
  },

  floatingSearchWrapper: {
    position: "absolute",
    left: "0%",
    transform: "translateX(-50%)",
    bottom: "-60px",
    width: "100%",
    maxWidth: "1500px",
    zIndex: 6,
    padding: "14px",
    boxSizing: "border-box",
    transition: "all 0.3s ease",
  },

  activeFilterBadge: {
    position: "absolute",
    top: "-10px",
    left: "20px",
    background: "#667eea",
    color: "#fff",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  },

  searchBar: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    background: "rgba(255, 255, 255, 0.95)",
    padding: "14px",
    borderRadius: "12px",
    boxShadow: "0 20px 50px rgba(10,20,40,0.12)",
    flexWrap: "wrap",
    position: "relative",
    border: "1px solid rgba(255,255,255,0.2)",
  },

  searchItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    background: "#f6f8fb",
    borderRadius: "999px",
    minWidth: "150px",
    flex: 1,
  },

  icon: {
    fontSize: "18px",
    marginRight: "6px",
    color: "#667eea",
  },

  select: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: "15px",
    width: "100%",
    cursor: "pointer",
    color: "#333",
    fontFamily: "inherit",
  },

  searchInputWrap: {
    flex: 2,
    minWidth: "180px",
    display: "flex",
    position: "relative",
  },

  searchInput: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "999px",
    border: "1px solid #e6e9ef",
    outline: "none",
    fontSize: "15px",
    fontFamily: "inherit",
    background: "rgba(255,255,255,0.9)",
    "&:focus": {
      borderColor: "#667eea",
      boxShadow: "0 0 0 3px rgba(102, 126, 234, 0.1)",
    },
  },

  clearSearchBtn: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    color: "#999",
    cursor: "pointer",
    fontSize: "18px",
    padding: "4px",
    "&:hover": {
      color: "#333",
    },
  },

  searchBtn: {
    background: "#667eea",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "999px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.2s",
    width: "100%",
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    "&:hover": {
      background: "#5a6fd8",
      transform: "translateY(-1px)",
    },
  },

  clearBtn: {
    background: "#f6f8fb",
    color: "#667eea",
    border: "1px solid #667eea",
    padding: "12px 16px",
    borderRadius: "999px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    fontSize: "14px",
    minWidth: "80px",
    "&:hover": {
      background: "#667eea",
      color: "#fff",
    },
  },

  suggestionBox: {
    marginTop: "10px",
    background: "rgba(255, 255, 255, 0.98)",
    borderRadius: "12px",
    boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
    maxHeight: "300px",
    overflowY: "auto",
    position: "relative",
    zIndex: 50,
    animation: "fadeInUp 0.2s ease-out",
    backdropFilter: "blur(10px)",
  },

  suggestionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #f0f0f0",
    fontSize: "14px",
    color: "#666",
  },

  suggestionItem: {
    padding: "12px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    marginBottom: "2px",
    background: "transparent",
    transition: "background 0.2s",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    "&:hover": {
      background: "#f0f4ff",
    },
  },

  suggestionType: {
    fontSize: "12px",
    color: "#888",
    background: "#f5f5f5",
    padding: "2px 6px",
    borderRadius: "4px",
  },

  suggestionArrow: {
    color: "#667eea",
    fontSize: "18px",
    opacity: 0.5,
  },

  /* ----- Property Types Section ----- */
  propertyTypesSection: {
    marginBottom: "60px",
    animation: "fadeInUp 0.6s ease-out",
    position: "relative",
    zIndex: 2,
  },

  propertyTypesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
    marginTop: "30px",
  },

  propertyTypeCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px 20px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 10px 30px rgba(10,20,40,0.06)",
    position: "relative",
    overflow: "hidden",
    "&:hover": {
      boxShadow: "0 20px 40px rgba(10,20,40,0.12)",
    },
  },

  propertyTypeIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },

  propertyTypeTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#1a1a1a",
    margin: "0 0 8px 0",
  },

  propertyTypeCount: {
    fontSize: "14px",
    color: "#666",
    margin: 0,
  },

  selectedBadge: {
    position: "absolute",
    top: "12px",
    right: "12px",
    background: "#667eea",
    color: "#fff",
    fontSize: "10px",
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: "12px",
  },

  /* ----- Services Section ----- */
  servicesSection: {
    marginBottom: "80px",
    animation: "fadeInUp 0.6s ease-out",
    position: "relative",
    zIndex: 2,
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "30px",
  },

  sectionTitle: {
    fontSize: "32px",
    marginBottom: "8px",
    fontWeight: 800,
    color: "#1a1a1a",
  },

  sectionSubtitle: {
    fontSize: "16px",
    color: "#666",
    maxWidth: "600px",
  },

  viewAllBtn: {
    padding: "10px 20px",
    background: "transparent",
    border: "2px solid #667eea",
    color: "#667eea",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    "&:hover": {
      background: "#667eea",
      color: "#fff",
    },
  },

  servicesRow: {
    display: "flex",
    gap: "25px",
    overflowX: "auto",
    padding: "20px 0",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },

  serviceCard: {
    minWidth: "320px",
    background: "#fff",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },

  serviceImage: {
    height: "200px",
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },

  serviceTypeBadge: {
    position: "absolute",
    top: "15px",
    right: "15px",
    background: "rgba(0,0,0,0.7)",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
    backdropFilter: "blur(4px)",
  },

  serviceContent: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    flex: 1,
  },

  serviceTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "#1a1a1a",
    margin: 0,
    lineHeight: 1.3,
  },

  serviceDescription: {
    fontSize: "14px",
    color: "#666",
    lineHeight: 1.5,
    margin: 0,
    flex: 1,
  },

  serviceDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "8px",
  },

  serviceDetailItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#555",
  },

  detailIcon: {
    fontSize: "16px",
    opacity: 0.7,
  },

  servicesList: {
    fontSize: "13px",
    color: "#666",
    lineHeight: 1.4,
  },

  serviceButton: {
    marginTop: "12px",
    padding: "12px 20px",
    background: "linear-gradient(90deg, #667eea, #764ba2)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "15px",
    transition: "all 0.2s",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 5px 15px rgba(102, 126, 234, 0.3)",
    },
  },

  /* ----- Properties Section ----- */
  propertiesSection: {
    marginBottom: "80px",
    animation: "fadeInUp 0.6s ease-out",
    position: "relative",
    zIndex: 2,
  },

  filterSummary: {
    fontSize: "15px",
    color: "#555",
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  filterTag: {
    background: "#f0f4ff",
    color: "#667eea",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 500,
  },

  filterActions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },

  clearFilterBtn: {
    padding: "10px 20px",
    background: "#f6f8fb",
    color: "#667eea",
    border: "1px solid #667eea",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    "&:hover": {
      background: "#667eea",
      color: "#fff",
    },
  },

  mobileFilterBtn: {
    display: "none",
    padding: "10px 20px",
    background: "#667eea",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
  },

  loadingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "28px",
    marginTop: "30px",
  },

  loadingCard: {
    background: "#fff",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(10,20,40,0.06)",
  },

  loadingImage: {
    height: "200px",
    width: "100%",
    borderRadius: "16px 16px 0 0",
  },

  loadingContent: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  loadingTitle: {
    height: "20px",
    width: "80%",
    borderRadius: "4px",
  },

  loadingMeta: {
    height: "16px",
    width: "60%",
    borderRadius: "4px",
  },

  loadingPrice: {
    height: "24px",
    width: "40%",
    borderRadius: "4px",
  },

  noResults: {
    textAlign: "center",
    padding: "80px 20px",
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(10,20,40,0.06)",
    marginTop: "30px",
  },

  noResultsIcon: {
    fontSize: "64px",
    marginBottom: "20px",
    opacity: 0.5,
  },

  noResultsTitle: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: "12px",
  },

  noResultsText: {
    fontSize: "16px",
    color: "#666",
    marginBottom: "24px",
    maxWidth: "400px",
    margin: "0 auto",
  },

  noResultsBtn: {
    padding: "12px 32px",
    background: "#667eea",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    "&:hover": {
      background: "#5a6fd8",
      transform: "translateY(-2px)",
    },
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "28px",
    marginTop: "30px",
  },

  card: {
    background: "#fff",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(10,20,40,0.06)",
    display: "flex",
    flexDirection: "column",
    minHeight: "420px",
    cursor: "pointer",
  },

  cardImage: {
    height: "220px",
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },

  propertyImage: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    transition: "transform 0.5s ease",
  },

  listingBadge: {
    position: "absolute",
    top: "15px",
    left: "15px",
    background: "rgba(0,0,0,0.7)",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    backdropFilter: "blur(4px)",
  },

  verifiedBadge: {
    position: "absolute",
    top: "15px",
    right: "15px",
    background: "#4caf50",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
    backdropFilter: "blur(4px)",
  },

  imageOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 600,
    opacity: 0,
    transition: "opacity 0.3s ease",
  },

  cardBody: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    flex: 1,
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },

  cardTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#1a1a1a",
    margin: 0,
    lineHeight: 1.4,
    flex: 1,
  },

  cardRating: {
    background: "#ffd700",
    color: "#333",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },

  metaRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  meta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "14px",
    color: "#666",
  },

  metaIcon: {
    fontSize: "14px",
    opacity: 0.7,
  },

  metaText: {
    fontSize: "13px",
  },

  propertyTypeTag: {
    background: "#f0f4ff",
    color: "#667eea",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 600,
    alignSelf: "flex-start",
  },

  cardDescription: {
    fontSize: "14px",
    color: "#666",
    lineHeight: 1.5,
    margin: 0,
    flex: 1,
  },

  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
    paddingTop: "16px",
    borderTop: "1px solid #f0f0f0",
  },

  price: {
    display: "flex",
    flexDirection: "column",
  },

  priceLabel: {
    fontSize: "12px",
    color: "#999",
    marginBottom: "2px",
  },

  priceAmount: {
    color: "#d32f2f",
    fontWeight: 800,
    fontSize: "20px",
  },

  rentPeriod: {
    fontSize: "14px",
    fontWeight: 400,
    color: "#777",
    marginLeft: "4px",
  },

  detailBtn: {
    padding: "10px 20px",
    background: "#667eea",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    "&:hover": {
      background: "#5a6fd8",
      transform: "translateY(-2px)",
    },
  },

  /* ----- Stats Section ----- */
  statsSection: {
    marginBottom: "80px",
    animation: "fadeInUp 0.6s ease-out",
    position: "relative",
    zIndex: 2,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "25px",
    marginTop: "40px",
  },

  statCard: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    padding: "30px 20px",
    borderRadius: "16px",
    textAlign: "center",
    boxShadow: "0 15px 40px rgba(102, 126, 234, 0.3)",
    transition: "transform 0.3s ease",
    position: "relative",
    overflow: "hidden",
    "&:hover": {
      transform: "translateY(-10px)",
    },
  },

  statIcon: {
    fontSize: "48px",
    marginBottom: "16px",
    opacity: 0.9,
    position: "relative",
    zIndex: 1,
  },

  statNumber: {
    fontSize: "36px",
    fontWeight: 800,
    marginBottom: "8px",
    position: "relative",
    zIndex: 1,
  },

  statLabel: {
    fontSize: "16px",
    opacity: 0.9,
    position: "relative",
    zIndex: 1,
  },

  /* ----- Mobile Filters Modal ----- */
  mobileFiltersModal: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 1000,
    display: "flex",
    alignItems: "flex-end",
  },

  mobileFiltersContent: {
    background: "#fff",
    width: "100%",
    maxHeight: "80vh",
    borderTopLeftRadius: "20px",
    borderTopRightRadius: "20px",
    padding: "20px",
    overflow: "auto",
  },

  mobileFiltersHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  mobileFiltersBody: {
    marginBottom: "20px",
  },

  mobileFiltersFooter: {
    display: "flex",
    gap: "12px",
  },

  applyFiltersBtn: {
    flex: 1,
    padding: "14px",
    background: "#667eea",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "16px",
    cursor: "pointer",
  },

  resetFiltersBtn: {
    flex: 1,
    padding: "14px",
    background: "#f6f8fb",
    color: "#667eea",
    border: "1px solid #667eea",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "16px",
    cursor: "pointer",
  },
};