import {render} from "../../js/helpers/test-utils";
import React from "react";
import DialogBox from "../../js/components/DialogBox";

describe("DialogBox", () => {
  it("DialogBox component renders without crashing", () => {
    render(<DialogBox open={false} />);
  });
});
