import { shallow } from "enzyme";
import React from "react";
import UrineScreen from "../../js/components/UrineScreen";

describe("UrineScreen", () => {
  it("Urine screen component renders without crashing", () => {
    const rowData = {
      id: 158,
      first_name: "Luke",
      last_name: "Skywalker",
      dob: "1977-01-12"
    };
    const wrapper = shallow(<UrineScreen rowData={rowData}/>);
    expect(wrapper).toBeDefined();
  });
});
