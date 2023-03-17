import { shallow } from "enzyme";
import React from "react";
import App from "../../js/containers/App";

describe("App", () => {
  it("App container component renders without crashing", () => {
    const wrapper = shallow(<App />);
    expect(wrapper).toBeDefined();
  });
});
