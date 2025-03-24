import styled from 'styled-components';

const OilProductsPageWrapper = styled.div`
  flex: 1;
  font-family: 'HeliosCondC';
  max-width: 100%;
  overflow-x: hidden;

  .form {
    padding: 12px;
    max-width: 100%;

    .ant-col,
    .ant-select-selector,
    .ant-input {
      font-family: 'HeliosCondC';
      max-width: 100%;
      font-size: 13px;
    }

    .ant-form-item {
      margin-bottom: 8px;
      max-width: 100%;
    }
  }

  .calculation-form {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0 12px;

    .ant-form-item-label {
      padding: 0;
      max-width: 100%;

      label {
        font-family: 'HeliosCondC';
        color: #666;
        font-size: 13px;
        height: auto;
        white-space: normal;
        text-align: left;
        line-height: 1.2;
        padding-bottom: 2px;
      }
    }

    .ant-input {
      font-family: 'HeliosCondC';
      border-radius: 4px;
      height: 32px;
      max-width: 100%;
      font-size: 13px;

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
    max-width: 100%;
    font-size: 13px;

    &:before {
      display: none;
    }
  }

  .settings-summary {
    background-color: #f8f9fa !important;
    border-radius: 8px !important;
    font-family: 'HeliosCondC';
    max-width: 100%;
    font-size: 13px;
  }

  .settings-content {
    padding: 0.75rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    font-family: 'HeliosCondC';
    max-width: 100%;
    font-size: 13px;

    .ant-form-item {
      margin-bottom: 0;
      max-width: 100%;
    }
  }

  .calculation-result {
    margin-top: 0.75rem;
    text-align: center;
    padding: 0.75rem;
    border-radius: 8px;
    background-color: #f8f9fa;
    font-family: 'HeliosCondC';
    max-width: 100%;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    font-size: 13px;

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
    padding: 6px;
    font-family: 'HeliosCondC';
    max-width: calc(100vw - 290px);

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
      font-size: 13px;
      min-height: 40px;
      color: #666;
      padding: 4px 12px;
      margin: 0 2px;
      border-radius: 8px;
      transition: all 0.3s ease;
      max-width: 200px;
      min-width: 120px;

      .MuiTab-wrapper {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: block;
        width: 100%;
      }

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
      flex-shrink: 0;

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
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0;
    font-family: 'HeliosCondC';
    max-width: 100%;
    font-size: 13px;
  }

  .development-message {
    text-align: center;
    padding: 1.5rem;
    color: #666;
    font-size: 13px;
    background: #f8f9fa;
    border-radius: 8px;
    margin: 0.75rem 0;
    font-family: 'HeliosCondC';
    max-width: 100%;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
  }

  /* Добавляем шрифт для всех Typography компонентов Material-UI */
  .MuiTypography-root {
    font-family: 'HeliosCondC' !important;
    max-width: 100%;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    margin-bottom: 0.5rem;

    /* Размеры для разных вариантов Typography */
    &.MuiTypography-h6 {
      font-size: 15px !important;

      /* Для заголовков методов */
      &[style*='text-align: center'] {
        font-size: 16px !important;
      }
    }

    &.MuiTypography-body1 {
      font-size: 13px !important;
    }

    &.MuiTypography-body2 {
      font-size: 12px !important;
    }
  }

  /* Добавляем шрифт для Alert компонента */
  .MuiAlert-root {
    font-family: 'HeliosCondC';
    max-width: 100%;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    margin: 0.5rem 0;
    font-size: 13px;
  }
`;

export default OilProductsPageWrapper;
