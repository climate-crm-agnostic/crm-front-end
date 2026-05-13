import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import {AuthProvider}  from './context/AuthContext.jsx';
import { CRMApp } from "./CRMApp.jsx";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <CRMApp />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
