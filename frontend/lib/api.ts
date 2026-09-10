import axios from "axios";

const api = axios.create({
  baseURL: "https://devlens-ajdn.onrender.com",
});

export default api;