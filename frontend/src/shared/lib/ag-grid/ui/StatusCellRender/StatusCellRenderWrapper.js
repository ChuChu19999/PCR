import styled from 'styled-components';

import { colors } from '../../../../assets/colors';

const StatusCellRenderWrapper = styled.div`
  .tag {
    padding: 4px;
    padding-left: 4px;
    border-radius: 6px;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    font-weight: 500;
    display: flex;
    align-items: center;
    height: 24px;
    font-size: 13px;
  }

  .trueTag {
    border: 1.5px solid ${colors['light'].tick_true_color};
    color: rgb(62, 184, 97);
  }

  .falseTag {
    border: 1px solid #cccccc;
    color: ${colors['light'].color_main_grey_50};
  }

  .tick {
    height: 16px;
    width: 16px;
    margin-right: 4px;
  }
`;

export default StatusCellRenderWrapper;
