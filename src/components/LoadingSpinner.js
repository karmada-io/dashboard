import React from "react";
import {
  SpinnerContainer,
  LoadingSpin
} from "../assets/styles/components/loading-spinner.styles";

function LoadingSpinner() {
  return (
    <SpinnerContainer>
      <LoadingSpin />
    </SpinnerContainer>
  );
}

export default LoadingSpinner;
