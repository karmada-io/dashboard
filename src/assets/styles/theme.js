import { createTheme } from "@mui/material";

const THEME = createTheme({
  palette: {
    primary: {
      dark: "#30344E",
      main: "#E9E9E9",
      light: "#EFEFEF"
    },
    // Border
    secondary: {
      main: "#F5F5F5"
    }
  },
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
    fontFamily: '"Roboto Slab", serif',
    h1: { fontSize: "24px" },
    h2: { fontSize: "22px" },
    h3: { fontSize: "16px" },
    h4: { fontSize: "15px", fontWeight: "700" },
    h5: { fontSize: "15px", fontWeight: "500" },
    subtitle1: { fontSize: "14px" },
    subtitle2: { fontSize: "10px" },
    body1: { fontSize: "15px" },
    body2: { fontSize: "13px" },
    button: { fontSize: "14px" }
  },
  select: {
    fontFamily: '"Roboto Slab", serif'
  },
  drawerWidth: "240"
});

export default THEME;
