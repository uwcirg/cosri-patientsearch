import {render, screen} from "../../js/helpers/test-utils";
import "@testing-library/jest-dom";
import "@testing-library/jest-dom";
import React from "react";
import Header from "../../js/components/Header";

describe("Header", () => {
  it("Header render without crashing", () => {
    render(<Header></Header>);
  });
  // use https://testing-library.com/docs/react-testing-library/intro/ for DOM testing
  it("contains logo image", async () => {
    render(<Header></Header>);
    expect(await screen.findByAltText("Logo")).toBeInTheDocument();
  });
});
