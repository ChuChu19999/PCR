import React from 'react';
import LoadingCardWrapper from './LoadingCardWrapper';
import { Spin } from 'antd';

const LoadingCard = () => {
  return (
    <LoadingCardWrapper loading={true}>
      <Spin size="large" tip="Загрузка..." />
    </LoadingCardWrapper>
  );
};

export default LoadingCard;
