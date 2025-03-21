import React from "react";
import {render} from "../../js/helpers/test-utils";
import App from "../../js/containers/App";

describe("App", () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ data: [] }),
      })
    );
  });

  it.skip("App container component renders without crashing", () => {
    render(<App></App>);
  });
});
