import styled from "styled-components";

import { colors } from "../../../../shared/assets/colors";

// type Props = {
//   loading: boolean;
// };

const LoadingCardWrapper = styled.div.withConfig({
  shouldForwardProp: (prop) => !["loading"].includes(prop),
})`
  position: absolute;
  height: 100vh;
  z-index: 999;
  width: -webkit-fill-available;

  display: flex;
  justify-content: center;
  align-items: center;

  opacity: ${(p) => (p.loading ? 1 : 0)};
  transition: opacity 300ms ease-out;

  background-color: ${colors["light"].color_white_20};
`;

export default LoadingCardWrapper;
