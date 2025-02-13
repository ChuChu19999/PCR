import { Form } from 'antd';
import Modal from './Modal';

const ModalWithForm = ({ children, ...props }) => {
  const [form] = Form.useForm();

  return (
    <Modal {...props}>
      <Form form={form} layout="vertical">
        {children}
      </Form>
    </Modal>
  );
};

export default ModalWithForm;
