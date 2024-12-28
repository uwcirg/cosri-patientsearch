import {render} from "../../js/helpers/test-utils";
import React from "react";
import Info from "../../js/components/Info";

describe("Info", () => {
  it("Info component renders without crashing", () => {
    render(<Info />);
  });
});
