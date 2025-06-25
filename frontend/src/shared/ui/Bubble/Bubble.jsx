import React from 'react';
import styled from 'styled-components';

const BubbleWrapper = styled.div`
  padding: 8px 16px;
  background-color: ${props => props.color || '#007DFE'};
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  p {
    margin: 0;
    font-family: 'HeliosCondC';
    font-size: 14px;
    color: ${props => props.textColor || '#fff'};
  }
`;

const Bubble = ({ text, color, textColor }) => {
  return (
    <BubbleWrapper color={color} textColor={textColor}>
      <p>{text}</p>
    </BubbleWrapper>
  );
};

export default Bubble;
