import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import {AuthProvider}  from './context/AuthContext.jsx';
import { CRMApp } from "./CRMApp.jsx";
import { loadDeploymentTimeZone } from "./utils/tz.js";

import "./index.css";

// Load the deployment timezone once, before render, so dates format in the
// deployment's zone from the first paint. Non-blocking fallback to UTC.
loadDeploymentTimeZone();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <CRMApp />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
