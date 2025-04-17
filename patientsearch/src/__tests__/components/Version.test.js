import React from "react";
import {render, screen} from "../../js/helpers/test-utils";
import "@testing-library/jest-dom";
import Version from "../../js/components/Version";

describe("Version", () => {
  it("Version component renders without crashing", async () => {
    render(<Version version="1.1"/>);
    expect(await screen.findByText("1.1")).toBeInTheDocument();
  });
  it("Empty Version component", () => {
    render(<Version />);
  });
});
