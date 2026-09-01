// src/router/RouterSetup.jsx
import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { setNavigate } from "../../shared/api/axios";

/**
 * Router Setup Component
 * Registers navigate function with axios and renders router outlet
 */
export function RouterSetup() {
  const navigate = useNavigate();

  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);

  return <Outlet />;
}