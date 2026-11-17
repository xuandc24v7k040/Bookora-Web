// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { FlexRender, getCoreRowModel, useVueTable } from "@tanstack/vue-table";
import type { CouponResponseDto } from "@/api/generated/models";
import { couponColumns, couponStatusLabels } from "./coupon-columns";

it("hiển thị badge outline với nền nhạt và kiểu chữ của bảng Đánh giá", () => {
  const data = Object.keys(couponStatusLabels).map((status) => ({ status } as CouponResponseDto));
  const table = mount(defineComponent({
    setup() {
      const table = useVueTable({ data, columns: couponColumns, getCoreRowModel: getCoreRowModel() });
      return () => h("div", table.getRowModel().rows.map((row) => {
        const cell = row.getVisibleCells().find((entry) => entry.column.id === "status")!;
        return h(FlexRender, { render: cell.column.columnDef.cell, props: cell.getContext() });
      }));
    },
  }));
  const badges = table.findAll('[data-slot="badge"]');
  expect(badges.map((badge) => badge.text())).toEqual(Object.values(couponStatusLabels));
  for (const badge of badges) {
    expect(badge.classes()).toContain("rounded-full");
    expect(badge.classes()).not.toContain("border-transparent");
    expect(badge.classes()).toContain("font-medium");
    expect(badge.classes()).not.toContain("font-bold");
    expect(badge.classes()).not.toContain("bg-transparent");
    expect(badge.element.childElementCount).toBe(0);
  }
  expect(badges[0]?.classes()).toEqual(expect.arrayContaining([
    "border-emerald-200", "bg-emerald-50", "text-emerald-700",
  ]));
  expect(badges[1]?.classes()).toEqual(expect.arrayContaining([
    "border-slate-200", "bg-slate-50", "text-slate-600",
  ]));
  expect(new Set(badges.map((badge) => badge.attributes("class"))).size).toBe(data.length);
  table.unmount();
});
