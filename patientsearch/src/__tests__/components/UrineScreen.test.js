import React from "react";
import {render} from "../../js/helpers/test-utils";
import UrineScreen from "../../js/components/UrineScreen";

describe("UrineScreen", () => {
  //functional component, use https://github.com/testing-library/react-testing-library
  it("Urine screen component renders without crashing", () => {
    const rowData = {
      id: 158,
      first_name: "Luke",
      last_name: "Skywalker",
      dob: "1977-01-12"
    };
    render(<UrineScreen rowData={rowData}/>);
  });
});
