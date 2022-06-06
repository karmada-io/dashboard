import React from "react";
import {
  LoginButton,
  LoginButtonContainer,
  LoginFormSubTitle,
  Note,
  CustomForm,
  RightSubContainer
} from "../assets/styles/components/login.style";
import PropTypes from "prop-types";
function Login({
  text,
  loginSubTitle,
  note,
  handleLogin,
  disabledLoginButton,
  children
}) {
  return (
    <RightSubContainer>
      <LoginFormSubTitle>{loginSubTitle}</LoginFormSubTitle>
      <Note>{note}</Note>
      <CustomForm onSubmit={handleLogin}>
        {children}
        <LoginButtonContainer>
          <LoginButton
            variant="contained"
            type="submit"
            disabled={disabledLoginButton}
          >
            {text}
          </LoginButton>
        </LoginButtonContainer>
      </CustomForm>
    </RightSubContainer>
  );
}
Login.propTypes = {
  text: PropTypes.string,
  loginSubTitle: PropTypes.string,
  note: PropTypes.string,
  handleLogin: PropTypes.func,
  disabledLoginButton: PropTypes.bool,
  children: PropTypes.element
};

export default Login;
