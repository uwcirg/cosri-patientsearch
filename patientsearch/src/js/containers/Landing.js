import React from "react";
import { render } from "react-dom";
import Layout from "../layout/Layout";
import Info from "../components/Info";
import Version from "../components/Version";

// entry point for pre-authenticated access
render(
  <Layout>
    <section className="landing">
      <Info />
      <Version className="version-container" />
    </section>
  </Layout>,
  document.getElementById("content")
);
