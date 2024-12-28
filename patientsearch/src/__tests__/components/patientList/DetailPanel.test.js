import {render} from "../../../js/helpers/test-utils";
import React from "react";
import DetailPanel from "../../../js/components/patientList/DetailPanel";

describe("DetailPanel", () => {
  it("DetailPanel component renders without crashing", () => {
    const data = {
      rowData: {
        id: 1,
      },
    };
    render(<DetailPanel data={data} />);
  });
});
