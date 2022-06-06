import { useLocation } from "react-router-dom";
import { Link } from "@mui/material";
import { GitHub } from "@mui/icons-material";
import LanguageTranslation from "./LanguageTranslation";
import {
  NavbarMainContainer,
  NavbarSubContainer,
  NavbarOpsContainer,
  OperationsContainer
} from "../assets/styles/components/navbar.styles";

function Navbar() {
  const location = useLocation();

  return (
    <NavbarMainContainer>
      <NavbarSubContainer>
        <div>
          <img
            src={require("../assets/images/karmada-horizontal-color-logo.png")}
            alt="karmada-logo"
          />
        </div>

        <NavbarOpsContainer>
          {location.pathname !== "/login" ? (
            <div>
              <div className="operations">SearchBar</div>
              <div className="operations">Namespaces</div>
            </div>
          ) : null}
          <LanguageTranslation />
          {/* <div className="operations theme-switcher">
            <ThemeSwitcher />
          </div> */}
          <OperationsContainer>
            <Link
              href="https://github.com/karmada-io/dashboard/"
              target="_blank"
              color="#000"
              rel="noreferrer"
            >
              <GitHub />
            </Link>
          </OperationsContainer>
        </NavbarOpsContainer>
      </NavbarSubContainer>
    </NavbarMainContainer>
  );
}
export default Navbar;
