import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "../../js/helpers/test-utils";
import Error from "../../js/components/Error";

describe("Error", () => {
  it("Error component renders without crashing", async () => {
    render(<Error message="test error" />);
    expect(await screen.findByText("test error")).toBeInTheDocument();
  });
});
