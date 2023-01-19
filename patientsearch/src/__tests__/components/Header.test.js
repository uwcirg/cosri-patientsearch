import { shallow } from "enzyme";
import React from "react";
import Header from "../../js/components/Header";

describe("Header", () => {
  it("Header render without crashing", () => {
    const wrapperLogout = shallow(<Header></Header>);
    expect(wrapperLogout).toBeDefined();
  });
  it("contains logo image", () => {
    expect(document.querySelector("img")).toBeDefined();
  })
});
