import React from "react";
import ReactDOM from "react-dom/client";
import { StyledEngineProvider } from "@mui/material";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./redux/store";
import "./i18nextConf";
import GlobalStyles from "./assets/styles/GlobalStyles";
import THEME from "./assets/styles/theme";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <GlobalStyles />
    <HelmetProvider>
      <Provider store={store}>
        <BrowserRouter>
          <StyledEngineProvider injectFirst>
            <ThemeProvider theme={THEME}>
              <App />
            </ThemeProvider>
          </StyledEngineProvider>
        </BrowserRouter>
      </Provider>
    </HelmetProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
