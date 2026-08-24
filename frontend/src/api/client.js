/**
 * client.js — Configured Axios instance for the Graphology AI Agent frontend.
 */

import axios from "axios";

export const setToken = (token) => {
  _token = token;
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
};

export const getToken = () => _token || localStorage.getItem("auth_token");

const client = axios.create({
  baseURL: "https://graphology-846t.onrender.com",
  timeout: 600000,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = getToken() !== null;
      setToken(null);
      if (hadToken) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const analyzeHandwriting = (formData) => {
  return client.post("/api/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getHistory = () => client.get("/history");

export const getMe = () => client.get("/auth/me");

export default client;

export const bookAppointment = async (data) => {
  const response = await client.post("/appointments", data);
  return response.data;
};
