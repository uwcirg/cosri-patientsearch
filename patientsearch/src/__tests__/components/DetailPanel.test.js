import { shallow } from "enzyme";
import React from "react";
import DetailPanel from "../../js/components/DetailPanel";

describe("DetailPanel", () => {
  it("DetailPanel component renders without crashing", () => {
    const wrapper = shallow(<DetailPanel />);
    expect(wrapper).toBeDefined();
  });
});
