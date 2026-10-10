import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Renderizar sin StrictMode para evitar problemas con hooks
const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
