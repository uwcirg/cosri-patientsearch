import { shallow } from "enzyme";
import React from "react";
import Version from "../../js/components/Version";

describe("Version", () => {
  it("Version component renders without crashing", () => {
    const wrapper = shallow(<Version version={"1.1"} />);
    expect(wrapper).toBeDefined();
  });
  it("Empty Version component", () => {
    const wrapper = shallow(<Version />);
    expect(wrapper).toEqual({});
  });
});
