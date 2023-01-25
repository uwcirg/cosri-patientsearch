import { shallow } from "enzyme";
import React from "react";
import FormattedInput from "../../js/components/FormattedInput";

describe("FormattedInput", () => {
  it("FormattedInput component renders without crashing", () => {
    const wrapper = shallow(<FormattedInput />);
    expect(wrapper).toBeDefined();
  });
});
