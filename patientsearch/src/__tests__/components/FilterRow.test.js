import { shallow } from "enzyme";
import React from "react";
import FilterRow from "../../js/components/FilterRow";

describe("FilterRow", () => {
  it("FilterRow component renders without crashing", () => {
    const wrapper = shallow(
      <FilterRow
        onFiltersDidChange={() => {
          console.log("Get to filter did change function.");
        }}
      />
    );
    expect(wrapper).toBeDefined();
  });
});
