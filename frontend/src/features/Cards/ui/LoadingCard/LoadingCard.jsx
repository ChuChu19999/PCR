import React, { useEffect, useState } from 'react';
import LoadingCardWrapper from './LoadingCardWrapper';
import { Spin } from 'antd';

const MIN_LOADING_TIME = 2000; // Минимальное время отображения лоадера (2 секунды)

const LoadingCard = ({ loading = true }) => {
  const [shouldShow, setShouldShow] = useState(loading);

  useEffect(() => {
    if (loading) {
      setShouldShow(true);
      return;
    }

    // Засекаем время начала загрузки
    const startTime = Date.now();

    // Вычисляем, сколько времени осталось до минимального времени отображения
    const remainingTime = Math.max(0, MIN_LOADING_TIME - (Date.now() - startTime));

    const timer = setTimeout(() => {
      setShouldShow(false);
    }, remainingTime);

    return () => clearTimeout(timer);
  }, [loading]);

  return (
    <LoadingCardWrapper loading={shouldShow}>
      <Spin size="large" tip="Загрузка..." />
    </LoadingCardWrapper>
  );
};

export default LoadingCard;
