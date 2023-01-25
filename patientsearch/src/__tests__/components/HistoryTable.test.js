import { shallow } from "enzyme";
import React from "react";
import HistoryTable from "../../js/components/HistoryTable";

describe("History table", () => {
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
    const wrapper = shallow(<HistoryTable data={data} columns={columns} APIURL={apiURL}/>);
    expect(wrapper).toBeDefined();
  });
});
