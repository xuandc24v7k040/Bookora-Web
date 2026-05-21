import { defineConfig } from "orval";

export default defineConfig({
  bookora: {
    input: {
      target: "http://localhost:8000/api/docs-json",
    },
    output: {
      mode: "tags-split",
      target: "src/api/generated/endpoints",
      schemas: "src/api/generated/models",
      client: "vue-query",
      httpClient: "axios",
      tsconfig: {
        compilerOptions: {
          target: "esnext",
        },
      },
      override: {
        mutator: {
          path: "src/api/mutator.ts",
          name: "customInstance",
        },
      },
    },
  },
});
