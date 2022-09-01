import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import { default as theme } from "../../assets/styles/theme";
import PropTypes from "prop-types";

Header.propTypes = {
  toggleDrawer: PropTypes.func
};

export default function Header({ toggleDrawer }) {
  return (
    <Box sx={{ flex: "1" }}>
      <AppBar
        position="relative"
        sx={{
          backgroundColor: theme.palette.primary.dark,
          color: "white",
          fontSize: theme.typography.h1,
          boxShadow: "none",
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar
          sx={{
            minHeight: "30px",
            "@media (min-width: 600px)": {
              minHeight: "30px"
            }
          }}
        >
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={toggleDrawer}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Playground
          </Typography>
          <Button color="inherit">Placeholder</Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
