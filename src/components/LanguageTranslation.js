import { useState } from "react";
import i18next from "i18next";

import { MenuItem } from "@mui/material";

import cookieOps from "../utils/cookieOps";
import LanguageTranslatorContainer from "../assets/styles/components/language-translator.style";
import {
  CustomSelect,
  PaddedLanguageIcon
} from "../assets/styles/components/navbar.styles";

const styles = {
  selectNoBorder: {
    border: "none"
  }
};
function LanguageTranslation() {
  const [language, setLanguage] = useState(
    cookieOps.getValue("i18nextLng") || "en"
  );

  const handleLanguageChange = (value) => {
    cookieOps.setKeyValue("i18nextLng", value);
    i18next.changeLanguage(value);
    setLanguage(value);
  };

  return (
    <LanguageTranslatorContainer>
      <PaddedLanguageIcon />
      <CustomSelect
        name="language"
        variant="standard"
        className={styles.selectNoBorder}
        inputProps={{ "aria-label": "language" }}
        value={language}
        onChange={(event) => handleLanguageChange(event.target.value)}
      >
        <MenuItem className="options" value="en">
          English
        </MenuItem>
        <MenuItem className="options" value="zh">
          Chinese
        </MenuItem>
      </CustomSelect>
    </LanguageTranslatorContainer>
  );
}

export default LanguageTranslation;
