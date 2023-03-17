import { shallow } from "enzyme";
import React from "react";
import Error from "../../js/components/Error";

describe("Error", () => {
  it("Error component renders without crashing", () => {
    const wrapper = shallow(<Error />);
    expect(wrapper).toBeDefined();
  });
});
