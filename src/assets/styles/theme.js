import { createTheme } from "@mui/material";

const THEME = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536
    }
  },
  typography: {
    fontFamily: '"Roboto Slab", serif'
  },
  select: {
    fontFamily: '"Roboto Slab", serif'
  }
});

export default THEME;
