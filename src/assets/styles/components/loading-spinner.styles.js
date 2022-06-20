import styled from "styled-components";

const SpinnerContainer = styled.div`
  display: grid;
  position: absolute;
  width: 100%;
  position: fixed;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.3);
  justify-content: center;
  align-items: center;
  height: 100vh;
`;

const LoadingSpin = styled.div`
  width: 30px;
  height: 30px;
  border: 6px solid #f3f3f3;
  border-top: 6px solid #383636;
  border-radius: 50%;
  animation: spinner 1.5s linear infinite;
  @keyframes spinner {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

export { SpinnerContainer, LoadingSpin };
