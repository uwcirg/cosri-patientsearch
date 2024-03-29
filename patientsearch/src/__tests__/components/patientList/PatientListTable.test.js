import { shallow } from "enzyme";
import React from "react";
import PatientListTable from "../../../js/components/patientList/PatientListTable";

describe("PatientListTable", () => {
  it("Patient list renders without crashing", () => {
    const wrapper = shallow(<PatientListTable />);
    expect(wrapper).toBeDefined();
  });
});
