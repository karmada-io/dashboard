import React from "react";
import { StyledEngineProvider } from "@mui/material";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { Provider } from "react-redux";
import { store } from "../redux/store";
import "../i18nextConf";
import GlobalStyles from "../assets/styles/GlobalStyles";
import THEME from "../assets/styles/theme";
import Dashboard from "../layout/index";
import renderer from "react-test-renderer";

it("renders without crashing", () => {
  const main = renderer.create(
    <React.StrictMode>
      <GlobalStyles />
      <HelmetProvider>
        <Provider store={store}>
          <BrowserRouter>
            <StyledEngineProvider injectFirst>
              <ThemeProvider theme={THEME}>{Dashboard()}</ThemeProvider>
            </StyledEngineProvider>
          </BrowserRouter>
        </Provider>
      </HelmetProvider>
    </React.StrictMode>
  );
  let tree = main.toJSON();
  expect(tree).toMatchSnapshot();
});
