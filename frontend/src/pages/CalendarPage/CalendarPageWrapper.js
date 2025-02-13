import styled from 'styled-components';

export const CalendarPageWrapper = styled.div`
  height: 100vh;
  overflow: auto;

  .rbc-month-view {
    padding: 10px;
    border-radius: 16px;
  }

  .rbc-month-header {
    font-size: var(--size-text-xs);
  }

  .rbc-toolbar {
    flex-direction: column;
    gap: 20px;
  }

  .rbc-overlay-header {
    color: #000;
    font-family: 'HeliosCondC';
  }

  .rbc-show-more {
    border-radius: 2px;
    border-color: #85c4ff !important;
  }

  .rbc-selected {
    background-color: #008cff !important;
  }
`;
