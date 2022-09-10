import React, { useState } from "react";
import { Typography, Pagination } from "@mui/material/";
import { rowsdata } from "./DataTable.data.js";
import DataTable from "./DataTable.js";
import {
  TablePaginationContainer,
  PaginationContainer,
  PageNoInput
} from "../assets/styles/components/pagination.styles";

export function usePagination(data, itemsPerPage) {
  const [currentPage, setCurrentPage] = useState(1);
  const maxPage = Math.ceil(data.length / itemsPerPage);

  function currentData() {
    const begin = (currentPage - 1) * itemsPerPage;
    const end = begin + itemsPerPage;
    return data.slice(begin, end);
  }

  function next() {
    setCurrentPage(Math.min(currentPage + 1, maxPage));
  }

  function prev() {
    setCurrentPage(Math.max(currentPage - 1, 1));
  }

  function jump(page) {
    const pageNumber = Math.max(1, page);
    setCurrentPage(Math.min(pageNumber, maxPage));
  }

  return { next, prev, jump, currentData, currentPage, maxPage };
}

const TableWithPagination = () => {
  let [page, setPage] = useState(1);
  const PER_PAGE = 2;

  const count = Math.ceil(rowsdata.length / PER_PAGE);
  const pagedData = usePagination(rowsdata, PER_PAGE);

  const handlePageChange = (e, p) => {
    setPage(p);
    pagedData.jump(p);
  };

  return (
    <TablePaginationContainer>
      <DataTable data={pagedData.currentData()} />
      <PaginationContainer>
        <Typography variant="body1" component="body1">
          Total {page} of 10
        </Typography>
        <Pagination
          count={count}
          page={page}
          variant="outlined"
          shape="rounded"
          color="primary"
          onChange={handlePageChange}
        />
        <Typography variant="body1" component="body1">
          Go to
        </Typography>
        <PageNoInput
          type="number"
          value={page}
          onChange={(e) => handlePageChange(e, e.target.value)}
        />
      </PaginationContainer>
    </TablePaginationContainer>
  );
};

export default TableWithPagination;
