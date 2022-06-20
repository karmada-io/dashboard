import { combineReducers } from "@reduxjs/toolkit";

import authReducer from "./auth/auth.reducer";
import rootReducer from "./root/root.reducer";

const indexReducer = combineReducers({
  auth: authReducer,
  root: rootReducer
});

export default indexReducer;
