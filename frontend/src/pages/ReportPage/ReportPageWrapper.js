import styled from 'styled-components';

import { colors } from '../../shared/assets/colors';
import { getTextColor } from '../../shared/model/getTextColor';

const ReportPageWrapper = styled.div`
  flex: 1;

  .button {
    margin: 30px;

    background-color: ${colors['light'].color_bright_blue_50};
    color: ${getTextColor(colors['light'].color_bright_blue_50)};
  }
`;

export default ReportPageWrapper;
