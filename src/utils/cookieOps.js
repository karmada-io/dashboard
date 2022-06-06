import Cookies from "js-cookie";

const getValue = (key) => Cookies.get(key);

const setKeyValue = (key, value) => {
  Cookies.set(key, value, { secure: true, sameSite: "none" });
};

const removeKey = (key) => {
  Cookies.remove(key);
};
export default {
  getValue,
  setKeyValue,
  removeKey
};
