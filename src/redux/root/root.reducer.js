import RootActionTypes from "./root.types";

const initialState = {
  isLoading: false,
  status: "",
  statusType: ""
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case RootActionTypes.SET_IS_LOADING_TRUE:
      return {
        ...state,
        isLoading: true
      };
    case RootActionTypes.SET_IS_LOADING_FALSE:
      return {
        ...state,
        isLoading: false
      };
    case RootActionTypes.SET_STATUS:
      return {
        ...state,
        status: action.payload.status,
        statusType: action.payload.statusType
      };
    case RootActionTypes.REMOVE_STATUS:
      return {
        ...state,
        status: "",
        statusType: ""
      };
    default:
      return state;
  }
};

export default rootReducer;
