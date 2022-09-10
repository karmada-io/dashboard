import styled from "styled-components";

const TablePaginationContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: center;
  align-items: center;
`;

const PaginationContainer = styled.div`
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: center;
`;

const PageNoInput = styled.input`
  width: 35px;
  height: 28px;
  text-align: center;
  border: 1px solid #aaa;
  border-radius: 3px;
  outline: 0;

  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

export { TablePaginationContainer, PaginationContainer, PageNoInput };
