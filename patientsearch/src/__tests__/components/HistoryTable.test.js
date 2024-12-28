import React from "react";
import {render} from "../../js/helpers/test-utils";
import HistoryTable from "../../js/components/HistoryTable";

describe("History table", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ data: [] }),
      })
    );
  });
  // functional component, use https://github.com/testing-library/react-testing-library
  it("History table component renders without crashing", () => {
    const data = [{
      id: 158,
      first_name: "Luke",
      last_name: "Skywalker",
      dob: "1977-01-12"
    }];
    const columns = [{
      "field": "id"
    }];
    const apiURL = "/fhir";
    render(<HistoryTable data={data} columns={columns} APIURL={apiURL}/>);
  });
});
