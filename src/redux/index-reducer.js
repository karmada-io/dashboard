import { combineReducers } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import authReducer from "./auth/auth.reducer";
import rootReducer from "./root/root.reducer";

const persistConfig = {
  key: "root",
  storage
};

const indexReducer = combineReducers({
  auth: authReducer,
  root: rootReducer
});

export default persistReducer(persistConfig, indexReducer);
