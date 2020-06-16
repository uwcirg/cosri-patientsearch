import { shallow } from 'enzyme';
import React from "react";
import Questionnaire from '../js/components/Questionnaire';

describe('Questionnaire', () => {
  it('Questionnaire render without crashing', () => {
    const wrapper = shallow(<Questionnaire carePlanId="1" />);
    expect(wrapper.find('.questionnaire-details-container').exists()).toBe(true);
  });
});

