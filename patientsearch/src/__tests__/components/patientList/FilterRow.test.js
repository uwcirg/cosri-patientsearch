import {render} from "../../../js/helpers/test-utils";
import React from "react";
import FilterRow from "../../../js/components/patientList/FilterRow";

describe("FilterRow", () => {
  //functional component need to use https://github.com/testing-library/react-testing-library
  it("FilterRow component renders without crashing", () => {
    render(
      <FilterRow
        onFiltersDidChange={() => {
          console.log("Get to filter did change function.");
        }}
      />
    );
  });
});
