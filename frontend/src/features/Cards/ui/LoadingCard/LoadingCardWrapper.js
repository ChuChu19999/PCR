import styled from 'styled-components';
import { colors } from '../../../../shared/assets/colors';

const LoadingCardWrapper = styled.div.withConfig({
  shouldForwardProp: prop => !['loading'].includes(prop),
})`
  position: absolute;
  inset: 0;
  z-index: 999;
  min-height: calc(100vh - 100px);

  display: flex;
  justify-content: center;
  align-items: center;

  opacity: ${p => (p.loading ? 1 : 0)};
  transition: opacity 300ms ease-out;

  background-color: ${colors['light'].color_white_20};
`;

export default LoadingCardWrapper;
