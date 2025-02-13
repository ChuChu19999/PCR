import React from 'react';
import Layout from '../../shared/ui/Layout/Layout';
import FormPageWrapper from './FormPageWrapper';
import { Form } from 'antd/lib';
import { formData, formRadioData } from './form.data';
import { ElementsList, FormItem } from '../../features/FormItems';
import { Button } from '../../shared/ui/Button/Button';
import { colors } from '../../shared/assets/colors';
import { InputText, RadioGroup, Select } from '../../shared/ui/FormItems';

const FormPage = () => {
  const [form] = Form.useForm();
  const onNameChange = e => {
    console.log(e.target.value);
  };

  const onChooseAuthor = value => {
    console.log('Автор продукта ', value);
  };

  const onSubmit = () => {
    const data = form.getFieldsValue();

    console.log(data);
  };

  return (
    <FormPageWrapper>
      <Layout title="Форма обратной связи">
        <Form name="form-example" layout="vertical" className="form" form={form}>
          <FormItem
            divider
            title="Название продукта"
            tooltip="Подсказка"
            name="name"
            rules={[
              {
                required: true,
                message: 'Пожалуйста, введите имя!',
                type: 'string',
              },
            ]}
          >
            <InputText
              allowClear
              placeholder="Название продукта"
              autoSize={{ minRows: 2, maxRows: 6 }}
              maxLength={100}
              onChange={onNameChange}
            />
          </FormItem>

          <FormItem
            divider
            title="Автор продукта"
            name="author"
            rules={[{ required: true, message: 'Обязательно для заполнения' }]}
          >
            <Select
              showSearch
              allowClear
              filterOption={false}
              placeholder="Автор продукта"
              options={formData}
              className="select"
              fieldNames={{ label: 'name', value: 'name' }}
              onChange={onChooseAuthor}
              optionRender={option => {
                return (
                  <div key={option.data.name}>
                    <p>{option.data.name}</p>
                    <p>{option.data.email}</p>
                  </div>
                );
              }}
            />
          </FormItem>

          <FormItem divider title="Соавторы">
            <ElementsList formName="soauthors" formData={formData} />
          </FormItem>

          <FormItem title="Тип продукта">
            <RadioGroup name="type" data={formRadioData} />
          </FormItem>

          <Button
            type="primary"
            buttonColor={colors['light'].color_bright_orange_50}
            wrapperStyle="button-wrapper"
            className="button-save"
            title="Сохранить"
            onClick={onSubmit}
          />
        </Form>
      </Layout>
    </FormPageWrapper>
  );
};

export default FormPage;
