import * as React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import { DataGrid as MuiDataGrid } from "@mui/x-data-grid";

DataGrid.propTypes = {
  columns: PropTypes.array,
  rows: PropTypes.array
};

export default function DataGrid({ columns, rows }) {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        "& .MuiDataGrid-cell:focus": {
          outlineWidth: "0px !important"
        },
        "& .MuiDataGrid-cell:focus-within": {
          outlineWidth: "0px !important"
        },
        "& .MuiDataGrid-columnHeader:focus": {
          outlineWidth: "0px !important"
        },
        "& .MuiDataGrid-columnHeader:focus-within": {
          outlineWidth: "0px !important"
        }
      }}
    >
      <MuiDataGrid
        rows={rows}
        columns={columns}
        autoHeight
        pageSize={10}
        rowsPerPageOptions={[10]}
        disableSelectionOnClick
        getRowHeight={() => "auto"}
        experimentalFeatures={{ newEditingApi: true }}
      />
    </Box>
  );
}
