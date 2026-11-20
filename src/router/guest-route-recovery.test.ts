// @vitest-environment happy-dom

import { AxiosError, AxiosHeaders, type AxiosAdapter } from "axios";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, describe, expect, it } from "vitest";
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
} from "vue-router";
import { resetHttpClientForTest, setupHttpClient } from "@/api/http/client";
import { resolveAuthNavigation, routes } from "@/router";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";

// Keep production route/meta/redirect definitions, without loading page queries.
function withoutPages(records: RouteRecordRaw[]): RouteRecordRaw[] {
  return records.map((record) => ({
    ...record,
    component: {},
    children: record.children ? withoutPages(record.children) : undefined,
  })) as RouteRecordRaw[];
}

afterEach(() => resetHttpClientForTest());

describe("guest navigation with the real auth bootstrap and HTTP interceptors", () => {
  for (const path of ["/account", "/super-admin", "/super-admin/dashboard"]) {
    it.each([401, 403, 400, 500, "timeout", "offline"] as const)(
      `${path} settles after %s without repeating redirects or auth requests`,
      async (failure) => {
        setActivePinia(createPinia());
        const requests: string[] = [];
        const adapter: AxiosAdapter = async (config) => {
          requests.push(config.url ?? "");
          if (config.url === "/auth/csrf-token") {
            return {
              config,
              status: 200,
              statusText: "OK",
              headers: {},
              data: { data: { csrfToken: "synthetic-csrf" } },
            };
          }
          const response =
            typeof failure === "number"
              ? {
                  config,
                  status: failure,
                  statusText: "Error",
                  headers: new AxiosHeaders(),
                  data: { message: "Synthetic auth failure" },
                }
              : undefined;
          throw new AxiosError(
            "Synthetic auth failure",
            failure === "timeout" ? "ECONNABORTED" : "ERR_NETWORK",
            config,
            undefined,
            response,
          );
        };
        resetHttpClientForTest(adapter);
        setupHttpClient();
        const auth = useAuthStore();
        const router = createRouter({
          history: createMemoryHistory(),
          routes: withoutPages(routes),
        });
        let guards = 0;
        router.beforeEach((to) => {
          // Fail safely even against the original unbounded redirect bug.
          if (++guards > 3)
            throw new Error("Auth navigation exceeded its redirect budget");
          return resolveAuthNavigation(to, auth, router, useBranchStore());
        });
        router.onError(() => undefined);

        await expect(router.push(path)).resolves.toBeUndefined();
        const final = router.currentRoute.value;
        if (failure === 401) {
          expect(final.name).toBe(
            path === "/account" ? "customer-login" : "admin-login",
          );
          expect(auth.status).toBe("anonymous");
          expect(requests).toEqual([
            "/auth/me",
            "/auth/csrf-token",
            "/auth/refresh",
          ]);
        } else {
          expect(final.name).toBe("auth-unavailable");
          expect(final.query.redirect).toBe(
            path === "/super-admin" ? "/admin-home" : path,
          );
          expect(auth.status).toBe("unknown");
          expect(requests).toEqual(["/auth/me"]);
        }
        expect(guards).toBe(2);
        const beforePublicNavigation = requests.length;
        for (const publicPath of [
          "/login",
          "/admin/login",
          "/register",
          "/forgot-password",
          "/verify-email",
        ]) {
          guards = 0;
          await router.push(publicPath);
          expect(router.currentRoute.value.path).toBe(publicPath);
          expect(guards).toBe(1);
        }
        expect(requests).toHaveLength(beforePublicNavigation);
      },
    );
  }
});
