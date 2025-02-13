import styled from 'styled-components';

import { colors } from '../../assets/colors';
import { getTextColor } from '../../model/getTextColor';

// type Props = {
//   themеlocal: ThemeEnum;
//   buttonColor?: string;
// };

const ButtonWrapper = styled.div.withConfig({
  shouldForwardProp: prop => !['themelocal', 'buttonColor'].includes(prop),
})`
  .ant-btn {
    font-family: 'HeliosCondC';

    background-color: ${p => p.buttonColor};
    color: ${p => p.buttonColor && getTextColor(p.buttonColor)};
  }

  .ant-btn-color-dangerous {
    color: ${p => colors[p.themеlocal].color_bright_orange_50};
  }

  .ant-btn-color-dangerous .ant-btn-variant-outlined {
    border-color: ${p => colors[p.themеlocal].color_bright_orange_50};
  }

  :focus,
  :focus-visible {
    outline: none;
  }
`;

export default ButtonWrapper;
