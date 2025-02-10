import Lottie from "lottie-react";
import LoadingCardWrapper from "./LoadingCardWrapper";
import animation from "../../../../shared/assets/animations/loading_inside.json";
import { useEffect } from "react";

// type Props = {
//   isLoading: boolean;
//   onCompleteLoading?: () => void;
// };

const LoadingCard = ({
  isLoading,
  onCompleteLoading,
}) => {
  useEffect(() => {
    if (!isLoading && onCompleteLoading) {
      const timer = setTimeout(onCompleteLoading, 300); // Длительность анимации исчезновения
      return () => clearTimeout(timer);
    }
  }, [isLoading, onCompleteLoading]);

  return (
    <LoadingCardWrapper loading={isLoading}>
      <Lottie animationData={animation} loop autoplay />
    </LoadingCardWrapper>
  );
};

export default LoadingCard;
