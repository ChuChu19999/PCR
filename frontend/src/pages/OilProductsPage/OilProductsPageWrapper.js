import styled from 'styled-components';

const OilProductsPageWrapper = styled.div`
  flex: 1;
  font-family: 'HeliosCondC';

  .form {
    padding: 15px;

    .ant-col,
    .ant-select-selector,
    .ant-input {
      font-family: 'HeliosCondC';
    }

    .ant-form-item {
      margin-bottom: 12px;
    }
  }

  .calculation-form {
    max-width: 600px;
    margin: 0 auto;
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 1rem;

    .ant-form-item-label {
      padding: 0;

      label {
        font-family: 'HeliosCondC';
        color: #666;
        font-size: 16px;
        height: 32px;
      }
    }

    .ant-input {
      font-family: 'HeliosCondC';
      border-radius: 4px;
      height: 32px;

      &:hover {
        border-color: #0066cc;
      }

      &:focus {
        border-color: #0066cc;
        box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
      }
    }
  }

  .settings-accordion {
    border-radius: 8px !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
    font-family: 'HeliosCondC';

    &:before {
      display: none;
    }
  }

  .settings-summary {
    background-color: #f8f9fa !important;
    border-radius: 8px !important;
    font-family: 'HeliosCondC';
  }

  .settings-content {
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    font-family: 'HeliosCondC';

    .ant-form-item {
      margin-bottom: 0;
    }
  }

  .calculation-result {
    margin-top: 1rem;
    text-align: center;
    padding: 1rem;
    border-radius: 8px;
    background-color: #f8f9fa;
    font-family: 'HeliosCondC';

    &.success {
      color: #0066cc;
    }

    &.error {
      color: #ff4d4f;
    }
  }

  .custom-tabs {
    background-color: #f8f9fa;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    overflow-x: auto;
    margin: 0;
    padding: 8px;
    font-family: 'HeliosCondC';

    /* Стилизация скроллбара */
    &::-webkit-scrollbar {
      height: 6px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: #0066cc;
      border-radius: 3px;
    }

    .MuiTab-root {
      font-family: 'HeliosCondC';
      font-weight: 500;
      text-transform: none;
      font-size: 15px;
      min-height: 44px;
      color: #666;
      padding: 6px 16px;
      margin: 0 4px;
      border-radius: 8px;
      transition: all 0.3s ease;

      &:hover {
        background-color: rgba(0, 102, 204, 0.04);
        color: #0066cc;
      }

      &.Mui-selected {
        color: #0066cc;
        background-color: rgba(0, 102, 204, 0.08);
      }
    }

    /* Стилизация кнопок прокрутки */
    .MuiTabs-scrollButtons {
      width: 28px;
      color: #0066cc;

      &.Mui-disabled {
        opacity: 0.3;
      }
    }
  }

  .tab-indicator {
    background-color: #0066cc;
    height: 3px;
    border-radius: 1.5px;
  }

  .tab-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 0;
    font-family: 'HeliosCondC';
  }

  .development-message {
    text-align: center;
    padding: 2rem;
    color: #666;
    font-size: 1.1rem;
    background: #f8f9fa;
    border-radius: 8px;
    margin: 1rem 0;
    font-family: 'HeliosCondC';
  }

  /* Добавляем шрифт для всех Typography компонентов Material-UI */
  .MuiTypography-root {
    font-family: 'HeliosCondC' !important;
  }

  /* Добавляем шрифт для Alert компонента */
  .MuiAlert-root {
    font-family: 'HeliosCondC';
  }
`;

export default OilProductsPageWrapper;
