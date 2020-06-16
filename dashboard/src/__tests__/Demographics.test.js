import { shallow } from 'enzyme';
import React from "react";
import Demographics from '../js/components/Demographics';

describe('Demographics', () => {
  it('Demographics render without crashing', () => {
    const info = {
        "name": "Test",
        "email": "abc@email.com"
    };
    const wrapper = shallow(<Demographics info={{info}}/>);
    expect(wrapper.find('.demographics-container').exists()).toBe(true);
  });
});

