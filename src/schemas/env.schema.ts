import { z } from "zod";

export const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default("http://localhost:8000/api"),
});
