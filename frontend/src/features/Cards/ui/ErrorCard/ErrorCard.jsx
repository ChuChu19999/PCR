import ErrorCardWrapper from './ErrorCardWrapper';
import Lottie from 'lottie-react';
import { Helmet } from 'react-helmet';

const ErrorCard = ({ title, text, animation }) => {
  return (
    <ErrorCardWrapper>
      <Helmet>
        <title>{title}</title>
      </Helmet>

      <div className="layout">
        <Lottie animationData={animation} loop autoplay />

        <div className="text">
          <p className="text-title">Упс!</p>
          <p className="text-main">{text}</p>
        </div>
      </div>
    </ErrorCardWrapper>
  );
};

export default ErrorCard;
