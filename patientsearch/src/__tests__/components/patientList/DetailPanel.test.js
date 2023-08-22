import { shallow } from "enzyme";
import React from "react";
import DetailPanel from "../../../js/components/patientList/DetailPanel";

describe("DetailPanel", () => {
  it("DetailPanel component renders without crashing", () => {
    const data = {
      rowData: {
        id: 1
      }
    }
    const wrapper = shallow(<DetailPanel data={data}/>);
    expect(wrapper).toBeDefined();
  });
});
