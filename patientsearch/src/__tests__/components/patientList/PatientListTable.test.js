import React from "react";
import { render } from "../../../js/helpers/test-utils";
import PatientListTable from "../../../js/components/patientList";

describe("PatientListTable", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ data: [] }),
      })
    );
  });

  //use https://testing-library.com/docs/react-testing-library/intro/
  it("Patient list renders without crashing", () => {
    render(<PatientListTable />);
  });
});
