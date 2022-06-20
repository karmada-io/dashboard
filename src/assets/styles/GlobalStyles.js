import { createGlobalStyle } from "styled-components";

import RobotoSlabWoff from "../fonts/roboto-slab-regular.woff";
import RobotoSlabWoff2 from "../fonts/roboto-slab-regular.woff2";

const GlobalStyles = createGlobalStyle`

@font-face {
  font-family: 'Roboto Slab';
  src: url(${RobotoSlabWoff}) format('woff'),
    url(${RobotoSlabWoff2}) format('woff2');
  }

  body {
    margin: 0px
  }
`;

export default GlobalStyles;
