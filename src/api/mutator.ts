import axios from "axios";
import type {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const axiosInstance = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

function attachAuthToken(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

axiosInstance.interceptors.request.use(attachAuthToken);

export async function customInstance<T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> {
  const response = await axiosInstance.request<T>({
    ...config,
    ...options,
  });

  return response.data;
}

export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
export type ResponseType<ResponseData> = AxiosResponse<ResponseData>;
