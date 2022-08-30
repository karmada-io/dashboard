import * as React from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import PropTypes from "prop-types";

import SidebarList from "../../components/SidebarList";

Sidebar.propTypes = {
  open: PropTypes.bool
};

export default function Sidebar({ open }) {
  return (
    <Box sx={{ display: "flex" }}>
      <Drawer
        sx={(theme) => {
          return {
            zIndex: 1,
            position: "relative",
            width: theme.drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              position: "relative",
              width: theme.drawerWidth,
              boxSizing: "border-box"
            }
          };
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <SidebarList />
      </Drawer>
    </Box>
  );
}
