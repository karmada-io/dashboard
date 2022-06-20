import RootActionTypes from "./root.types";

const setLoadingTrue = () => ({
  type: RootActionTypes.SET_IS_LOADING_TRUE
});

const setLoadingFalse = () => ({
  type: RootActionTypes.SET_IS_LOADING_FALSE
});

const setStatus = (payload) => ({
  type: RootActionTypes.SET_STATUS,
  payload
});

const removeStatus = () => ({
  type: RootActionTypes.REMOVE_STATUS
});

export { setLoadingTrue, setLoadingFalse, setStatus, removeStatus };
