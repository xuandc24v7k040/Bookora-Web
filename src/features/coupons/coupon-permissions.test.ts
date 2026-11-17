import { describe, expect, it } from "vitest";
import type { AuthMeResponseDto } from "@/api/generated/models";
import { createPermissionPolicy } from "@/authorization/permission-policy";
import { resolveVisibleAdminMenu } from "@/authorization/admin-menu";

describe("Global coupon menu", () => {
  it.each([
    ["SYSTEM", true, true],
    ["SYSTEM", false, false],
    ["BRANCH", false, false],
    ["CUSTOMER", false, false],
  ] as const)(
    "restricts coupon menu for %s super=%s",
    (type, isSuperAdmin, visible) => {
      const policy = createPermissionPolicy(
        {
          type,
          isSuperAdmin,
          globalPermissions: [],
        } as unknown as AuthMeResponseDto,
        { isInitialized: true, effectivePermissions: [] },
      );
      const ids = resolveVisibleAdminMenu(type, policy).flatMap(
        (item) => item.children?.map((child) => child.id) ?? [],
      );
      expect(ids.includes("coupons")).toBe(visible);
    },
  );
});
