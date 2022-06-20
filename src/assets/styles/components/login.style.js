import styled from "styled-components";
import { Button } from "@mui/material";

const CustomForm = styled.form`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const RightSubContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const LoginFormSubTitle = styled.h2`
  font-size: 26px;
  font-weight: 400;
`;

const Note = styled.p`
  color: #c0c4cc;
  font-size: 14px;
  font-weight: 400;
`;

const LoginButtonContainer = styled.div`
  margin-top: auto;
`;

const LoginButton = styled(Button)`
  width: 100%;
  padding: 3px;
  margin: 5px 0;
  font-size: 18px;
  color: #fff;
  background-color: rgba(39, 101, 255, 0.76);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  border-radius: 0.25rem;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
  background-position: center;
  font-size: 16px;
  text-transform: initial;
  &:hover {
    background-color: rgba(39, 101, 255, 0.9);
  }
  &:disabled {
    color: rgba(0, 0, 0, 0.26);
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
    background-color: rgb(255, 255, 255);
  }
`;

export {
  CustomForm,
  RightSubContainer,
  LoginFormSubTitle,
  Note,
  LoginButtonContainer,
  LoginButton
};
