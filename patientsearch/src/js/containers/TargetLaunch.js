import React from "react";
import { createRoot } from "react-dom/client";
import ClientAppRedirect from "../components/ClientAppRedirect";
import Layout from "../layout/Layout";

const root = createRoot(document.getElementById("content"));
root.render(
  <Layout>
    <ClientAppRedirect></ClientAppRedirect>
  </Layout>
);
