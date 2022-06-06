import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { useDispatch, useSelector } from "react-redux";
import { MoreHoriz as MoreHorizIcon } from "@mui/icons-material";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import cookieOps from "../utils/cookieOps";
import { AUTH_MODE, AUTH_MODE_TOKEN } from "../constants/index";
import { loginApi } from "../apis/login";
import { loginSuccess } from "../redux/auth/auth.actions";
import {
  LoginPageContainer,
  IntroMainContainer,
  IntroSubContainer,
  Title,
  InputContainer,
  CustomImage,
  KubeFileInputContainer,
  TokenInput,
  LoginMainContainer,
  LoginSubContainer,
  LeftMainContainer,
  RightMainContainer,
  AuthModeRadioGroup,
  AuthMode,
  CustomFormControlLabel,
  FileInput
} from "../assets/styles/pages/login-page.styles";
import Login from "../components/Login";
import {
  setLoadingFalse,
  setLoadingTrue,
  setStatus
} from "../redux/root/root.action";

function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const hiddenFileInput = React.useRef(null);
  const isLoading = useSelector((state) => state.root.isLoading);
  let from = location.state?.from?.pathname || "/";

  const [authMode, setAuthMode] = useState(
    localStorage.getItem(AUTH_MODE) || AUTH_MODE_TOKEN
  );

  const [authToken, setAuthToken] = useState("");

  const [kubeConfigFile, setKubeConfigFile] = useState("");

  const handleAuthModeChange = (event) => {
    setAuthMode(event.target.value);
    setAuthToken("");
    setKubeConfigFile("");
    localStorage.setItem(event.target.name, event.target.value);
  };

  const handleFileInput = () => {
    hiddenFileInput.current.click();
  };

  const handleFileUploadChange = (event) => {
    const fileUploaded = event.target.files[0];
    console.log(fileUploaded);
    setKubeConfigFile(fileUploaded);
  };

  const handleLogin = (event) => {
    event.preventDefault();
    localStorage.setItem(AUTH_MODE, authMode);
    dispatch(setLoadingTrue());
    loginApi(authMode === "token" ? authToken : kubeConfigFile)
      .then((res) => {
        const { items } = res;
        dispatch(setLoadingFalse());
        if (items) {
          console.log(items);

          dispatch(loginSuccess(items));
          dispatch(
            setStatus({
              status: "Login Success!!",
              statusType: "success"
            })
          );
          navigate(from, { replace: true });
        } else {
          dispatch(
            setStatus({
              status: "Login Failed!!. Items cannot be null",
              statusType: "error"
            })
          );
        }
      })
      .catch((error) => {
        dispatch(setLoadingFalse());
        dispatch(
          setStatus({
            status: error.message,
            statusType: "error"
          })
        );
      });
  };
  return (
    <div>
      {cookieOps.getValue("isAuthenticated") === "true" ? (
        <Navigate to="/" />
      ) : (
        <LoginPageContainer>
          <Helmet>
            <meta charSet="utf-8" />
            <title>Login | Karmada</title>
            <meta
              name="description"
              content="Login page of Karmada Dashboard"
            />
          </Helmet>
          <Navbar />
          <IntroMainContainer>
            <IntroSubContainer>
              <Title>{t("welcome_to_karmada_dashboard")}</Title>
              <AuthModeRadioGroup
                aria-labelledby="select-auth-mode"
                value={authMode}
                name="authMode"
                row
                onChange={handleAuthModeChange}
              >
                <CustomFormControlLabel
                  disableTypography
                  value="token"
                  sx={{
                    margin: "0px"
                  }}
                  control={<AuthMode color="default" />}
                  label={t("token_auth_mode")}
                />
                <CustomFormControlLabel
                  sx={{
                    margin: "0px"
                  }}
                  disableTypography
                  value="kubeconfig"
                  control={<AuthMode color="default" />}
                  label={t("kube_config_auth_mode")}
                />
              </AuthModeRadioGroup>
            </IntroSubContainer>
          </IntroMainContainer>
          <LoginMainContainer>
            <LoginSubContainer>
              <LeftMainContainer>
                <CustomImage
                  src={require("../assets/images/login-screen-left-image.png")}
                  alt="cluster-image"
                />
              </LeftMainContainer>
              <RightMainContainer>
                {authMode === "token" ? (
                  <Login
                    text={t("login")}
                    note={t("token_login_note")}
                    handleLogin={handleLogin}
                    loginSubTitle={t("token_login")}
                    tokenHelpText={t("token_help_text")}
                    disabledLoginButton={isLoading || authToken === ""}
                  >
                    <InputContainer>
                      <TokenInput
                        cols={60}
                        rows={10}
                        name="token"
                        placeholder={t("token_help_text")}
                        required
                        onChange={(event) =>
                          setAuthToken(event.target.value.trim())
                        }
                      />
                    </InputContainer>
                  </Login>
                ) : (
                  <Login
                    text={t("login")}
                    note={t("kube_config_note")}
                    handleLogin={handleLogin}
                    loginSubTitle={t("kube_config_login")}
                    disabledLoginButton={isLoading || kubeConfigFile === ""}
                  >
                    <KubeFileInputContainer onClick={handleFileInput}>
                      {kubeConfigFile
                        ? kubeConfigFile.name
                        : t("kube_config_helper_text")}
                      <FileInput
                        type="file"
                        ref={hiddenFileInput}
                        onChange={handleFileUploadChange}
                      />
                      <MoreHorizIcon />
                    </KubeFileInputContainer>
                  </Login>
                )}
              </RightMainContainer>
            </LoginSubContainer>
          </LoginMainContainer>
        </LoginPageContainer>
      )}
    </div>
  );
}

export default LoginPage;
