import Lottie from 'lottie-react';
import React, { useEffect } from 'react';

import animation from '../../shared/assets/animations/main_loading.json';
import LoadingPageWrapper from './LoadingPageWrapper';

// type Props = {
//   isLoading?: boolean;
//   onFadeOutComplete?: () => void;
// };

const LoadingPage = ({ isLoading, onFadeOutComplete }) => {
  useEffect(() => {
    if (!isLoading && onFadeOutComplete) {
      const timer = setTimeout(onFadeOutComplete, 300); // Длительность анимации исчезновения
      return () => clearTimeout(timer);
    }
  }, [isLoading, onFadeOutComplete]);

  return (
    <LoadingPageWrapper isLoading={isLoading || false}>
      <Lottie animationData={animation} loop autoplay />
    </LoadingPageWrapper>
  );
};

export default LoadingPage;
