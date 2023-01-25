import { shallow } from "enzyme";
import React from "react";
import OverdueAlert from "../../js/components/OverdueAlert";

describe("OverdueAlert", () => {
  it("OverdueAlert component renders without crashing", () => {
    const wrapper = shallow(<OverdueAlert date="2021-01-01" type="test"/>);
    expect(wrapper).toBeDefined();
  });
  it("Empty OverdueAlert component", () => {
    const wrapper = shallow(<OverdueAlert date="2050-02-02" type="test"/>);
    expect(wrapper).toEqual({});
  });
});
