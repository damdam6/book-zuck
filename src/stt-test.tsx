import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { SttTest } from "./SttTest";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SttTest />
  </StrictMode>,
);
