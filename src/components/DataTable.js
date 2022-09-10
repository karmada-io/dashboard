import React, { useState } from "react";
import {
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  StyledTable,
  StyledTableCell,
  StyledMenuItem
} from "../assets/styles/components/datatable.styles";
import { labelMap } from "./DataTable.data.js";
import PropTypes from "prop-types";

const DataTable = ({ data }) => {
  let allKeys = Object.keys(data[0]) || [];
  allKeys = allKeys.filter((key) => key !== "id");

  return (
    <TableContainer component={Paper}>
      <StyledTable aria-label="customized table">
        <TableHead>
          <TableRow>
            {allKeys.map((currKey) => (
              <StyledTableCell align="center" key={currKey}>
                {labelMap[currKey]}
              </StyledTableCell>
            ))}
            <StyledTableCell key="actionmenu" />
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              {allKeys.map((currKey) => (
                <StyledTableCell key={`${currKey}-${row.id}`} align="center">
                  {row[currKey] || "NIL"}
                </StyledTableCell>
              ))}
              <StyledTableCell key={`actionrow-${row.id}`} align="center">
                <ActionMenu />
              </StyledTableCell>
            </TableRow>
          ))}
        </TableBody>
      </StyledTable>
    </TableContainer>
  );
};

const ActionMenu = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const actions = ["Edit", "Delete"];

  return (
    <>
      <IconButton
        aria-label="more"
        id="long-button"
        aria-controls={open ? "long-menu" : undefined}
        aria-expanded={open ? "true" : undefined}
        aria-haspopup="true"
        onClick={handleClick}
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id="long-menu"
        MenuListProps={{
          "aria-labelledby": "long-button"
        }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {actions.map((action) => (
          <StyledMenuItem key={action} onClick={handleClose}>
            {action}
          </StyledMenuItem>
        ))}
      </Menu>
    </>
  );
};

DataTable.propTypes = {
  data: PropTypes.array
};

export default DataTable;
