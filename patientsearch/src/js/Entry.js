import "core-js/stable"; //include polyfill for browser support
import "regenerator-runtime/runtime";
import React from "react";
import { render } from "react-dom";
import App from "./App";

// entry point
render(<App />, document.getElementById("content"));
