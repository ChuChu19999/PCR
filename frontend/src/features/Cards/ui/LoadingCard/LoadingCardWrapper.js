import styled from 'styled-components';
import { colors } from '../../../../shared/assets/colors';

const LoadingCardWrapper = styled.div.withConfig({
  shouldForwardProp: prop => !['loading'].includes(prop),
})`
  position: absolute;
  inset: 0;
  height: 100%;
  z-index: 999;

  display: flex;
  justify-content: center;
  align-items: center;

  opacity: ${p => (p.loading ? 1 : 0)};
  transition: opacity 300ms ease-out;

  background-color: ${colors['light'].color_white_20};
`;

export default LoadingCardWrapper;
