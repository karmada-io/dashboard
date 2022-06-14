import AuthActionTypes from "./auth.types";

export const loginSuccess = (payload) => ({
  type: AuthActionTypes.LOGIN_SUCCESS,
  payload: payload
});

export const logout = () => ({
  type: AuthActionTypes.LOGOUT
});
