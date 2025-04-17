import {render} from "../../js/helpers/test-utils";
import React from "react";
import TimeoutModal from "../../js/components/TimeoutModal";

describe("TimeoutModal", () => {
  it("TimeoutModal component renders without crashing", () => {
    render(<TimeoutModal />);
  });
});
