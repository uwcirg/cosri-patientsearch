import { shallow } from 'enzyme';
import React from "react";
import App from '../js/App';

describe('App', () => {
  it('App render without crashing', () => {
    const wrapper = shallow(<App />);
    expect(wrapper.find('.landing').exists()).toBe(true);
  });
});
