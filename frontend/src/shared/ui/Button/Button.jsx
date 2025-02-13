import { Button } from 'antd';

import { ThemeEnum } from '../../constants/theme';
import ButtonWrapper from './ButtonWrapper';

// type Props = ButtonProps & {
//   title: string;
//   buttonColor?: string;
//   onClick: () => void;
//   wrapperStyle?: string;
// };

const ButtonLocal = ({ title, buttonColor, wrapperStyle, ...props }) => (
  <ButtonWrapper buttonColor={buttonColor} themеlocal={ThemeEnum.light} className={wrapperStyle}>
    <Button {...props}>{title}</Button>
  </ButtonWrapper>
);

export { ButtonLocal as Button };
