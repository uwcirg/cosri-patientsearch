import "core-js/stable"; //include polyfill for browser support
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// entry point
const root = createRoot(document.getElementById("content"));
root.render(<App />);
