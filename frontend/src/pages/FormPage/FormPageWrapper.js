import styled from 'styled-components';

const FormPageWrapper = styled.div`
  flex: 1;

  .form {
    padding: 15px;

    .ant-col,
    .ant-select-selector,
    textarea {
      font-family: 'HeliosCondC';
    }
  }

  .ant-divider-horizontal {
    margin: 12px 0;
  }

  .ant-form-item {
    margin-bottom: 12px;
  }

  .ant-select-single {
    width: 100%;
  }

  .ant-select-selector {
    flex: 1;
  }

  .ant-radio-wrapper {
    font-family: 'HeliosCondC';
  }

  .button-save {
    margin-top: 40px;
  }

  .button-wrapper {
    display: flex;
    justify-content: center;
  }
`;

export default FormPageWrapper;
