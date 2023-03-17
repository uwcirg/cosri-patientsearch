import { shallow } from "enzyme";
import React from "react";
import Agreement from "../../js/components/Agreement";

describe("Agreement", () => {
  it("Agreement component renders without crashing", () => {
    const rowData = {
      id: 158,
      first_name: "Luke",
      last_name: "Skywalker",
      dob: "1977-01-12"
    };
    const wrapper = shallow(<Agreement rowData={rowData}/>);
    expect(wrapper).toBeDefined();
  });
});
