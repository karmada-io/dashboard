import styled from "styled-components";

const NotificationMainContainer = styled.div`
  position: absolute;
  display: flex;
  justify-content: end;
  width: 100%;
  bottom: 0;
  right: 0;
`;

const NotificationSubContainer = styled.div`
  margin: 1rem;
`;

export { NotificationMainContainer, NotificationSubContainer };
