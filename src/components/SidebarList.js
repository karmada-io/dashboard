import * as React from "react";
import PropTypes from "prop-types";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Collapse from "@mui/material/Collapse";

const listItems = [
  {
    key: "Cluster Management",
    sub: [{ key: "Cluster" }, { key: "Other Cluster Resources" }]
  },
  {
    key: "Propagation Policy",
    sub: [{ key: "Cluster Propagation Policy" }]
  },
  { key: "Override Policy", sub: [{ key: "Cluster Override Policy" }] },
  { key: "Resource Binding", sub: [{ key: "Cluster Resource Binding" }] },
  { key: "Work" },
  { key: "Settings" },
  { key: "About" }
];

const generateList = (listItem, open, handleClick) => {
  return (
    <List key={listItem.key} disablePadding>
      {listItem.sub ? (
        <>
          <ListItemButton onClick={handleClick.bind(this, listItem.key)}>
            <ListItemText primary={listItem.key} />
            {open[listItem.key] ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={open[listItem.key]} timeout="auto" unmountOnExit>
            <List
              component="div"
              disablePadding
              sx={(theme) => {
                return {
                  backgroundColor: theme.palette.primary.light
                };
              }}
            >
              {listItem.sub.map(({ key }) => (
                <ListItemButton key={key} sx={{ pl: 4 }}>
                  <ListItemText primary={key} />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
        </>
      ) : (
        <ListItem key={listItem.key} disablePadding>
          <ListItemButton
            sx={(theme) => {
              return {
                border: "0.5px",
                borderColor: theme.palette.primary.main
              };
            }}
          >
            <ListItemText primary={listItem.key} />
          </ListItemButton>
        </ListItem>
      )}
    </List>
  );
};

const getDefaultState = (listItems) => {
  const defaultState = {};
  listItems.forEach((listItem) => {
    if ("sub" in listItem) {
      defaultState[listItem.key] = false;
    }
  });
  return defaultState;
};

export default function SidebarList() {
  const [open, setOpen] = React.useState(getDefaultState(listItems));
  const handleClick = (id, e) => {
    const newState = { [id]: !open[id] };
    setOpen((oldOpen) => {
      return { ...oldOpen, ...newState };
    });
  };
  return (
    <>
      <Divider />
      {listItems.map((listItem) => generateList(listItem, open, handleClick))}
    </>
  );
}
