import { shallow } from "enzyme";
import React from "react";
import SystemBanner from "../../js/components/SystemBanner";

describe("SystemBanner", () => {
  it("SystemBanner component renders without crashing", () => {
    const wrapper = shallow(<SystemBanner systemType="development" />);
    expect(wrapper).toBeDefined();
  });
});

describe("SystemBanner", () => {
  it("Empty SystemBanner component renders without crashing", () => {
    const wrapper = shallow(<SystemBanner/>);
    expect(wrapper).toEqual({});
  });
});
