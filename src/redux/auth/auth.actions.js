import UserActionTypes from "./auth.types";

export const loginSuccess = (items) => ({
  type: UserActionTypes.LOGIN_SUCCESS,
  payload: items
});

export const logout = () => ({
  type: UserActionTypes.LOGOUT
});
