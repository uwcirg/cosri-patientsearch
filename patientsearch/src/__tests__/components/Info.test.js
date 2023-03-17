import { shallow } from "enzyme";
import React from "react";
import Info from "../../js/components/Info";

describe("Info", () => {
  it("Info component renders without crashing", () => {
    const wrapper = shallow(<Info />);
    expect(wrapper).toBeDefined();
  });
});
