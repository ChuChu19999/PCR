import styled from 'styled-components';

// type Props = {
//   isLoading: boolean;
//   themelocal: ThemeEnum;
// };

const LoadingPageWrapper = styled.div.withConfig({
  shouldForwardProp: prop => !['isLoading'].includes(prop),
})`
  position: fixed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100%;
  background-color: white;
  top: 0;
  left: 0;
  z-index: 9999;
  opacity: ${p => (p.isLoading ? 1 : 0)};
  transition: opacity 300ms ease-out;
`;

export default LoadingPageWrapper;
