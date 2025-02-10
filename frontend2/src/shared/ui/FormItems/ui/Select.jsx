import React from "react";
import { Select } from "antd";

// type Props = SelectProps & {};

const SelectLocal = (props) => {
  return <Select className={props.className || "select"} {...props} />;
};

export default SelectLocal;
