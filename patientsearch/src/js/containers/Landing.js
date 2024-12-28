import React from "react";
import { createRoot } from "react-dom/client";
import Layout from "../layout/Layout";
import Info from "../components/Info";
import Version from "../components/Version";

// entry point for pre-authenticated access
const root = createRoot(document.getElementById("content"));
root.render(
  <Layout>
    <section className="landing">
      <Info />
      <Version className="version-container" />
    </section>
  </Layout>
);
