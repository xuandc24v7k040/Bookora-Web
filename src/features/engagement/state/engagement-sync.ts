import type { QueryClient } from "@tanstack/vue-query";
import { customerOrderKeys } from "@/features/orders/api/customer-orders-api";
import { engagementKeys } from "../api/engagement-api";
import {
  invalidateReviewProduct,
  type ReviewProductChange,
} from "./review-invalidation";

const CHANNEL_NAME = "bookora-engagement";
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  channel ??= new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

export function publishEngagementChange(product?: ReviewProductChange): void {
  getChannel()?.postMessage({ type: "changed", at: Date.now(), product });
}

export function installEngagementSync(queryClient: QueryClient): () => void {
  const activeChannel = getChannel();
  if (!activeChannel) return () => undefined;
  const listener = (event: MessageEvent<unknown>): void => {
    void queryClient.invalidateQueries({ queryKey: engagementKeys.all });
    void queryClient.invalidateQueries({ queryKey: customerOrderKeys.all });
    void queryClient.invalidateQueries({ queryKey: customerOrderKeys.details });
    const data = event.data as {
      product?: Partial<ReviewProductChange>;
    } | null;
    if (
      typeof data?.product?.productId === "string" &&
      typeof data.product.productSlug === "string"
    ) {
      invalidateReviewProduct(queryClient, {
        productId: data.product.productId,
        productSlug: data.product.productSlug,
      });
    }
    window.dispatchEvent(new CustomEvent("bookora:engagement-changed"));
  };
  activeChannel.addEventListener("message", listener);
  return () => activeChannel.removeEventListener("message", listener);
}
