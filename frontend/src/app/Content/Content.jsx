import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../../widgets/Sidebar';
import { ContentWrapper } from './ContentWrapper';

const Content = ({ username }) => {
  return (
    <ContentWrapper>
      <Sidebar username={username} />
      <Outlet />
    </ContentWrapper>
  );
};

export default Content;
