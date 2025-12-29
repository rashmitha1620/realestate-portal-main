// src/utils/fixMediaUrl.js

const BACKEND_URL =
  import.meta.env.VITE_SERVER_URL ||
  "https://realestate-portal-1-wm4q.onrender.com";

export function fixMediaUrl(path) {
  if (!path) return "";

  // Absolute URL (cloudinary / render)
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // 🔥 REMOVE /api for images
  return `${BACKEND_URL.replace("/api", "")}${cleanPath}`;
}
