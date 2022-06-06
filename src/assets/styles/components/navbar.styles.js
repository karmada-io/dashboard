import { Language } from "@mui/icons-material";
import { Select } from "@mui/material";
import styled from "styled-components";

const NavbarMainContainer = styled.div`
  border-bottom: 2px solid rgba(0, 0, 0, 0.25);
`;

const NavbarSubContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0px 15px;
  padding-top: 10px;

  @media screen and (max-width: 600px) {
    justify-content: center;
  }
`;

const NavbarOpsContainer = styled.div`
  display: flex;
  align-items: center;
  @media screen and (max-width: 600px) {
    display: none;
  }
`;

const OperationsContainer = styled.div`
  padding: 0 5px;
  margin: 0 5px;
  cursor: pointer;
`;

const PaddedLanguageIcon = styled(Language)`
  padding: 0 10px;
`;

const CustomSelect = styled(Select)`
  color: #000;
  font-family: "Roboto Slab", serif;
  .MuiInputBase-input {
    &:focus {
      background-color: #fff !important;
    }
  }

  &::before,
  &::after {
    border: none;
  }
`;

export {
  NavbarMainContainer,
  NavbarSubContainer,
  NavbarOpsContainer,
  OperationsContainer,
  PaddedLanguageIcon,
  CustomSelect
};
