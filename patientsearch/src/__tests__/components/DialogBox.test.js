import { shallow } from "enzyme";
import React from "react";
import DialogBox from "../../js/components/DialogBox";

describe("DialogBox", () => {
  it("DialogBox component renders without crashing", () => {
    const wrapper = shallow(<DialogBox />);
    expect(wrapper).toBeDefined();
  });
});
