import { shallow } from "enzyme";
import React from "react";
import Dropdown from "../../js/components/Dropdown";

describe("Dropdown", () => {
  it("Dropdown component renders without crashing", () => {
    const menuItems = [{"id": "test", "text": "test"}];
    const wrapper = shallow(<Dropdown menuItems={menuItems} />);
    expect(wrapper).toBeDefined();
  });

  it("Empty Dropdown component renders without crashing", () => {
    const wrapper = shallow(<Dropdown/>);
    expect(wrapper).toEqual({});
  });
});
