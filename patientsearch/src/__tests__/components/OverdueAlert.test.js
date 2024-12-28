import {render} from "../../js/helpers/test-utils";
import React from "react";
import OverdueAlert from "../../js/components/OverdueAlert";

describe("OverdueAlert", () => {
  it("OverdueAlert component renders without crashing", () => {
    render(<OverdueAlert date="2021-01-01" type="test"/>);
  });
  it("Empty OverdueAlert component", () => {
    render(<OverdueAlert date="2050-02-02" type="test"/>);
  });
});
