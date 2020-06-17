import { shallow } from 'enzyme';
import React from "react";
import Search from '../js/components/Search';

describe('Search', () => {
  it('Search interface render without crashing', () => {
    const wrapper = shallow(<Search />);
    expect(wrapper.find('#searchContainer').exists()).toBe(true);
  });
});
