import Lottie from 'lottie-react';
import React, { useEffect, useState } from 'react';

import animation from '../../shared/assets/animations/main_loading.json';
import LoadingPageWrapper from './LoadingPageWrapper';

const MIN_LOADING_TIME = 2000; // Минимальное время отображения лоадера (2 секунды)

const LoadingPage = ({ isLoading, onFadeOutComplete }) => {
  const [shouldShow, setShouldShow] = useState(true);

  useEffect(() => {
    if (isLoading) {
      setShouldShow(true);
      return;
    }

    // Засекаем время начала загрузки
    const startTime = Date.now();

    // Вычисляем, сколько времени осталось до минимального времени отображения
    const remainingTime = Math.max(0, MIN_LOADING_TIME - (Date.now() - startTime));

    const timer = setTimeout(() => {
      setShouldShow(false);
      if (onFadeOutComplete) {
        // Добавляем 300мс для анимации исчезновения
        setTimeout(onFadeOutComplete, 300);
      }
    }, remainingTime);

    return () => clearTimeout(timer);
  }, [isLoading, onFadeOutComplete]);

  return (
    <LoadingPageWrapper isLoading={shouldShow}>
      <Lottie animationData={animation} loop autoplay />
    </LoadingPageWrapper>
  );
};

export default LoadingPage;
