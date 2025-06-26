import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../../widgets/Sidebar';
import { ContentWrapper } from './ContentWrapper';

const Content = ({ username }) => {
  const [minimize, setMinimize] = useState(false);

  const handleMinimizeChange = value => {
    setMinimize(value);
  };

  return (
    <ContentWrapper>
      <Sidebar username={username} onMinimizeChange={handleMinimizeChange} />
      <Outlet context={{ minimize }} />
    </ContentWrapper>
  );
};

export default Content;
