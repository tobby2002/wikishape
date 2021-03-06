import React, { useState } from 'react';
import Form from "react-bootstrap/Form";
import PropTypes from "prop-types";
import Code from "./Code";
import { format2mode } from './Utils';

function ByText(props) {

  const [code,setCode] = useState(props.textAreaValue);

  function handleChange(value) {
    setCode(value);
    props.handleByTextChange(value);
  }

  let inputText;
  if (props.inputForm) {
         inputText = props.inputForm
     } else {
         inputText = <Code value={code}
                           mode={format2mode(props.textFormat)}
                           onChange={handleChange}
                           placeholder={props.placeholder}
                           readonly='false'
         />
     }
     return (
        <Form.Group>
         <Form.Label>{props.name}</Form.Label>
         {inputText}
        </Form.Group>
     );
}

ByText.propTypes = {
    name: PropTypes.string,
    textAreaValue: PropTypes.string,
    handleByTextChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    textFormat: PropTypes.string,
    importForm: PropTypes.element
};

ByText.defaultProps = {
    placeholder: '',
};

export default ByText;
