import axios from "axios";
import { toast } from "react-toastify";
import { TOKEN } from "../constants";
import cookieOps from "./cookieOps";

import "react-toastify/dist/ReactToastify.css";

// create an axios instance
const service = axios.create({
  headers: {
    "Content-Type": "application/merge-patch+json"
  },
  baseURL: "/", // url = base url + request url
  withCredentials: true, // send cookies when cross-domain requests
  timeout: 15000 // request timeout
});

// request interceptor
service.interceptors.request.use(
  (config) => {
    if (cookieOps.getValue(TOKEN)) {
      config.headers.Authorization = `Bearer ${cookieOps.getValue(TOKEN)}`;
    }
    return config;
  },
  (error) =>
    // do something with request error
    Promise.reject(error)
);

// response interceptor
service.interceptors.response.use(
  (response) => {
    const res = response.data;

    // if the custom code is not 20000, it is judged as an error.
    if (
      response.status !== 200 &&
      response.status !== 201 &&
      response.status !== 204
    ) {
      toast({
        message: res.message || "Error",
        type: "error",
        duration: 5 * 1000
      });
      return Promise.reject(new Error(res || "Error"));
    }
    return res;
  },
  (error) => {
    console.log(`Error ：${error}`);
    toast({
      message: "Error",
      type: "error",
      duration: 10 * 1000
    });
    if (error.response.status === 401) {
      console.log("401");
    }
    return Promise.reject(error);
  }
);

export default service;
