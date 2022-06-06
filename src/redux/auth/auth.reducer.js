import { IS_AUTHENTICATED, TOKEN } from "../../constants";
import cookieOps from "../../utils/cookieOps";
import AuthActionTypes from "./auth.types";

const initialState = {
  user: {
    roles: "",
    introduction: "",
    avatar: "",
    name: ""
  },
  authToken: cookieOps.getValue(TOKEN) || "",
  isAuthenticated: localStorage.getItem(IS_AUTHENTICATED) || false
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case AuthActionTypes.LOGIN_SUCCESS:
      cookieOps.setKeyValue(action.payload.token);
      localStorage.setItem(IS_AUTHENTICATED, true);
      return {
        ...state,
        isAuthenticated: true,
        authToken: action.payload.token
      };
    case AuthActionTypes.LOGOUT:
      cookieOps.removeKey(TOKEN);
      localStorage.removeItem(IS_AUTHENTICATED);
      return {
        ...state,
        isAuthenticated: false,
        authToken: ""
      };
    default:
      return state;
  }
};

export default authReducer;
