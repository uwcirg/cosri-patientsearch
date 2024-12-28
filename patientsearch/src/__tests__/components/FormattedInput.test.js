import React from "react";
import {render, screen} from "../../js/helpers/test-utils";
import FormattedInput from "../../js/components/FormattedInput";

describe("FormattedInput", () => {
  //functional component need to use https://github.com/testing-library/react-testing-library
  it.skip("FormattedInput component renders without crashing", () => {
    render(<FormattedInput value="test"/>);
    expect(screen.getByText('test')).toBeInTheDocument();

  });
});
