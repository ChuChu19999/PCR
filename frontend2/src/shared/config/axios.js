import axios from "axios";

import { URL_LOCAL } from "./process";

export const axiosInstance = axios.create({
  baseURL: URL_LOCAL,
});
