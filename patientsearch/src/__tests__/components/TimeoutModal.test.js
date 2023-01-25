import { shallow } from "enzyme";
import React from "react";
import TimeoutModal from "../../js/components/TimeoutModal";

describe("TimeoutModal", () => {
  it("TimeoutModal component renders without crashing", () => {
    const wrapper = shallow(<TimeoutModal />);
    expect(wrapper).toBeDefined();
  });
});
