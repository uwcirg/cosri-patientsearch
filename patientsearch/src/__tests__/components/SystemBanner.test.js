import {render} from "../../js/helpers/test-utils";
import React from "react";
import SystemBanner from "../../js/components/SystemBanner";

describe("SystemBanner", () => {
  it("SystemBanner component renders without crashing", () => {
    render(<SystemBanner systemType="development" />);
  });
});

describe("SystemBanner", () => {
  it("Empty SystemBanner component renders without crashing", () => {
    render(<SystemBanner />);
  });
});
