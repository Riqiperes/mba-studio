import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppFeedbackProvider } from "@/components/ui/AppFeedbackProvider";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("No se encontro el elemento #root en index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppFeedbackProvider>
      <App />
    </AppFeedbackProvider>
  </StrictMode>,
);
