import Cookies from "js-cookie";

const getValue = (key) => Cookies.get(key);

const setKeyValue = (key, value) => {
  Cookies.set(key, value, { sameSite: "Strict" });
};

const removeKey = (key) => {
  Cookies.remove(key);
};
export default {
  getValue,
  setKeyValue,
  removeKey
};
