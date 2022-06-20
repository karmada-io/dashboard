import { Close as CloseIcon } from "@mui/icons-material";
import { Alert, Collapse, IconButton } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  NotificationMainContainer,
  NotificationSubContainer
} from "../assets/styles/components/notify.style";
import { removeStatus } from "../redux/root/root.action";

function Notify() {
  const dispatch = useDispatch();
  const status = useSelector((state) => state.root.status);
  const statusType = useSelector((state) => state.root.statusType) || "success";

  const [open, setOpen] = useState(status !== "");

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        setOpen(false);
        dispatch(removeStatus());
      }, 2000);
    }
  }, []);

  return (
    <NotificationMainContainer>
      <NotificationSubContainer>
        <Collapse in={open}>
          <Alert
            severity={statusType}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => {
                  setOpen(false);
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {status}
          </Alert>
        </Collapse>
      </NotificationSubContainer>
    </NotificationMainContainer>
  );
}

export default Notify;
