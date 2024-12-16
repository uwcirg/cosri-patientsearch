import React from "react";
import { render } from "react-dom";
import ClientAppRedirect from "../components/ClientAppRedirect";
import Layout from "../layout/Layout";

render(
  <Layout>
    <ClientAppRedirect></ClientAppRedirect>
  </Layout>,
  document.getElementById("content")
);
