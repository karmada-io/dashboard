import logger from "redux-logger";
import { configureStore } from "@reduxjs/toolkit";
import indexReducer from "./index-reducer";

const middlewares = [];

if (process.env.NODE_ENV === "development") {
  middlewares.push(logger);
}

export const store = configureStore({
  reducer: indexReducer,
  middleware: middlewares,
  enhancers: window.devToolsExtension ? window.devToolsExtension() : (f) => f
});
