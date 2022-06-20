import { Radio, RadioGroup, FormControlLabel } from "@mui/material";
import styled from "styled-components";

const LoginPageContainer = styled.div`
  height: 100vh;
`;

const IntroMainContainer = styled.div`
  display: flex;
  justify-content: center;
  font-family: "Roboto Slab", serif;
`;

const IntroSubContainer = styled.div`
  text-align: center;
  margin: 15px;
  padding: 15px;
  width: max-content;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 400;
`;

const AuthModeContainer = styled.div`
  padding: 10px;
  display: flex;
  justify-content: space-between;
`;

const InputLabel = styled.label`
  font-size: 18px;
  cursor: pointer;
`;

const LoginMainContainer = styled.div`
  display: flex;
  justify-content: center;
  font-family: "Roboto Slab", serif;
  margin: 15px;
`;

const LoginSubContainer = styled.div`
  display: flex;
  border: 1px solid rgb(214, 204, 204, 0.2);
`;

const LeftMainContainer = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid rgb(214, 204, 204, 0.2);
  @media (max-width: 900px) {
    display: none;
  }
`;

const CustomImage = styled.img`
  width: 100%;
`;

const RightMainContainer = styled.div`
  padding: 15px 25px;
  border: 1px solid rgb(214, 204, 204, 0.2);
  min-height: 45vh;
`;

const KubeFileInputContainer = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 15px;
  margin: 25px 0;
  cursor: pointer;
  border: 1px solid rgba(215, 211, 211, 0.6);
  :hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
`;

const FileInput = styled.input`
  display: none;
`;

const InputContainer = styled.div`
  width: 100%;
`;

const TokenInput = styled.textarea`
  resize: none;
  box-sizing: border-box;
  font-size: 16px;
  padding: 15px;
  border: 1px solid rgba(215, 211, 211, 0.5);
  width: 100%;
  outline: none;
  margin-bottom: 15px;
  ::placeholder {
    font-size: 16px;
    font-weight: 400;
    color: #c0c4cc;
  }
`;

const AuthModeRadioGroup = styled(RadioGroup)`
  display: flex;
  justify-content: space-between;
`;

const CustomFormControlLabel = styled(FormControlLabel)`
  margin: 0px;
`;

const AuthMode = styled(Radio)`
  &.Mui-checked {
    color: #000;
  }
`;

export {
  LoginPageContainer,
  IntroMainContainer,
  IntroSubContainer,
  Title,
  AuthModeContainer,
  LoginMainContainer,
  LoginSubContainer,
  LeftMainContainer,
  InputLabel,
  RightMainContainer,
  FileInput,
  CustomImage,
  KubeFileInputContainer,
  InputContainer,
  TokenInput,
  AuthMode,
  AuthModeRadioGroup,
  CustomFormControlLabel
};
