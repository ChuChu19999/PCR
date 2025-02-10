import React from "react";
import { Form } from "antd/lib";
import { Checkbox, Col, Row } from "antd";

import { BiMinusCircle, BiPlus } from "react-icons/bi";

import { ElementsListWrapper } from "./ElementsListWrapper";
import { Select } from "../../../../shared/ui/FormItems";
import { Button } from "../../../../shared/ui/Button/Button";
import { Tooltip } from "../../../../shared/ui/Tooltip/Tooltip";

// type Props = {
//   formName: string;
// };

// Важно не запутаться в key для полей формы,
// иначе функции удаления и добавления будут работать некорректно

const ElementsList = ({ formName, formData }) => {
  const [data, setData] = React.useState(formData);

  return (
    <ElementsListWrapper>
      <Form.List name={formName}>
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restFields }) => (
              <div key={key}>
                <Row
                  align="middle"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    width: "100%",
                  }}
                >
                  <Col flex={1}>
                    <Row key={"flex-row"} className="flex-row">
                      <Col flex={1}>
                        <Form.Item {...restFields}>
                          <Select
                            allowClear
                            filterOption={false}
                            placeholder="Соавтор продукта"
                            options={data}
                            style={{ width: "100%" }}
                            fieldNames={{ label: "name", value: "name" }}
                            onChange={(value) => {
                              console.log(value);
                            }}
                            optionRender={(option) => {
                              return (
                                <div key={option.data.name}>
                                  <p style={{ margin: 5 }}>
                                    {option.data.name}
                                  </p>
                                  <p style={{ margin: 5 }}>
                                    {option.data.email}
                                  </p>
                                </div>
                              );
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col className="options">
                        <Form.Item name="checkbox">
                          <Tooltip
                            placement="top"
                            title="Много полезной ифнформации"
                          >
                            <Checkbox className="checkbox" />
                          </Tooltip>
                        </Form.Item>
                        <BiMinusCircle
                          size={20}
                          className="button-delete-item"
                          onClick={() => remove(name)}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </div>
            ))}

            <Form.Item>
              <Button
                title="Добавить элемент"
                className="button-add"
                icon={<BiPlus size={20} />}
                onClick={add}
              />
            </Form.Item>
          </>
        )}
      </Form.List>
    </ElementsListWrapper>
  );
};

export default ElementsList;
