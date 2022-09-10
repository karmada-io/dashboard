import { Table, MenuItem } from "@mui/material";
import { styled } from "@mui/material/styles";
import { grey } from "@mui/material/colors";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";

const StyledTable = styled(Table)(() => ({
  minWidth: "600px",
  width: "100%",
  maxWidth: "94vw",
  margin: "1vw 2vw"
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontFamily: '"Roboto Slab", serif',
  border: `1px solid ${grey[500]}`,
  padding: "5px 15px",
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.action.hover,
    color: grey[700],
    fontWeight: "bold"
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    color: grey[600]
  }
}));

const StyledMenuItem = styled(MenuItem)(() => ({
  fontFamily: '"Roboto Slab", serif',
  fontSize: 14
}));

export {
  StyledTable,
  StyledTableCell,
  StyledMenuItem,
};
