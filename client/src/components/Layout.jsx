import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "./Footer";

export default function Layout() {
  const [showFooter, setShowFooter] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setShowFooter(false); // reset on route change

    const onScroll = () => {
      if (window.scrollY > 600) {
        setShowFooter(true);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  return (
    <>
      <Outlet />
      {showFooter && <Footer />}
    </>
  );
}