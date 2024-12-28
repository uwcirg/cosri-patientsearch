import React from "react";
import {render, screen} from "../../js/helpers/test-utils";
import "@testing-library/jest-dom";
import Dropdown from "../../js/components/Dropdown";

describe("Dropdown", () => {
  it("Dropdown component renders without crashing", async () => {
    const menuItems = [{ id: "test", text: "test" }];
    render(<Dropdown menuItems={menuItems} />);
    expect(await screen.findByText("test")).toBeInTheDocument();
  });
});
