<script setup lang="ts">
import { ArrowLeft, Mail } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import AuthBrand from "@/components/client/auth/AuthBrand.vue";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthResendEmailVerificationBody, AuthVerifyEmailBody } from "@/api/generated/zod/auth/auth";
import { resendVerification, verifyEmail } from "../api/email-verification-api";
import { emailVerificationError } from "../email-verification-errors";

const props = defineProps<{ initialEmail?: string; delivery?: "SENT" | "FAILED"; cooldownSeconds?: number }>();
const route = useRoute();
const router = useRouter();
const email = ref(props.initialEmail ?? "");
const state = ref<"inbox" | "verifying" | "success" | "error">("inbox");
const message = ref(props.delivery === "FAILED"
  ? "Tài khoản đã được tạo nhưng chưa gửi được email xác minh. Vui lòng thử gửi lại."
  : "Vui lòng mở liên kết trong email để xác minh trước khi đăng nhập. Kiểm tra cả thư mục spam; thời hạn liên kết được ghi trong email.");
const fieldError = ref("");
const sending = ref(false);
const retryable = ref(false);
const token = ref("");
const remaining = ref(0);
let cooldownUntil = 0;
let active = true;
let timer: ReturnType<typeof setInterval> | undefined;
const heading = computed(() => state.value === "success" ? "Xác minh email thành công" : state.value === "verifying" ? "Đang xác minh email" : state.value === "error" ? "Không thể xác minh email" : "Kiểm tra hộp thư của bạn");

function startCooldown(seconds: number): void {
  cooldownUntil = Date.now() + seconds * 1000;
  remaining.value = Math.ceil(seconds);
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    remaining.value = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
    if (!remaining.value && timer) clearInterval(timer);
  }, 1000);
}

async function confirmToken(): Promise<void> {
  if (!token.value || state.value === "verifying") return;
  state.value = "verifying";
  retryable.value = false;
  try {
    await verifyEmail(token.value);
    if (!active) return;
    token.value = "";
    state.value = "success";
    message.value = "Email đã được xác minh. Bạn có thể đăng nhập tài khoản Bookora.";
  } catch (error: unknown) {
    if (!active) return;
    const mapped = emailVerificationError(error);
    state.value = "error";
    message.value = mapped.message;
    retryable.value = mapped.retryable;
  }
}

async function readLink(): Promise<void> {
  const rawToken = new URLSearchParams(route.hash.replace(/^#/, "")).get("token") ?? route.query.token;
  if (typeof rawToken !== "string") return;
  // Keep the one-time token in memory only, removing it before any API call.
  token.value = rawToken;
  const { token: _token, ...query } = route.query;
  await router.replace({ path: route.path, query, hash: "" });
  if (!active) return;
  if (!AuthVerifyEmailBody.safeParse({ token: rawToken }).success) {
    state.value = "error";
    message.value = "Liên kết xác minh email không hợp lệ.";
    token.value = "";
    return;
  }
  await confirmToken();
}

async function resend(): Promise<void> {
  if (sending.value || remaining.value || state.value === "verifying") return;
  const parsed = AuthResendEmailVerificationBody.safeParse({ email: email.value.trim() });
  if (!parsed.success) {
    fieldError.value = "Vui lòng nhập email đúng định dạng.";
    return;
  }
  fieldError.value = "";
  sending.value = true;
  try {
    const result = await resendVerification(parsed.data.email);
    if (!active) return;
    state.value = "inbox";
    message.value = result.message;
    startCooldown(result.resendCooldownSeconds);
    toast.success("Yêu cầu gửi lại đã được tiếp nhận.", { id: "email-verification" });
  } catch (error: unknown) {
    if (!active) return;
    const mapped = emailVerificationError(error);
    message.value = mapped.message;
    state.value = "error";
    if (mapped.rateLimited) startCooldown(props.cooldownSeconds ?? 60);
    toast.error(mapped.message, { id: "email-verification" });
  } finally {
    sending.value = false;
  }
}

watch(() => route.hash, () => { if (route.hash) void readLink(); });
onMounted(() => {
  if (props.cooldownSeconds) startCooldown(props.cooldownSeconds);
  void readLink();
});
onBeforeUnmount(() => { active = false; token.value = ""; if (timer) clearInterval(timer); });
</script>

<template>
  <section class="min-h-0 bg-white" aria-labelledby="email-verification-heading">
    <div class="mx-auto flex min-h-full w-full max-w-[480px] flex-col justify-center px-6 py-10 sm:px-8 md:px-10">
      <AuthBrand />
      <div class="mt-6">
        <h1 id="email-verification-heading" class="text-[1.875rem] font-semibold leading-tight tracking-[-0.025em] text-[var(--bookora-auth-ink)]">{{ heading }}</h1>
        <p class="mt-2 text-sm leading-6 text-[var(--bookora-auth-muted)]">Xác minh email đăng ký tài khoản Bookora.</p>
      </div>
      <div v-if="state === 'verifying'" class="mt-6 space-y-4" role="status" aria-label="Đang xác minh email">
        <Skeleton class="h-16 w-full" /><Skeleton class="h-11 w-full" />
      </div>
      <template v-else>
        <Alert class="mt-6 break-words" :variant="state === 'error' || delivery === 'FAILED' && state === 'inbox' ? 'destructive' : 'default'" aria-live="polite">
          <AlertTitle>{{ state === 'success' ? 'Email đã được xác minh' : 'Hướng dẫn xác minh' }}</AlertTitle>
          <AlertDescription>{{ message }}</AlertDescription>
        </Alert>
        <Button v-if="state === 'error' && retryable && token" variant="outline" class="mt-4" @click="confirmToken">Thử xác minh lại</Button>
        <form v-if="state !== 'success'" class="mt-6 flex flex-col gap-3" novalidate @submit.prevent="resend">
          <Field class="gap-1">
            <FieldLabel for="verification-email">Email đăng ký</FieldLabel>
            <div class="relative">
              <Mail aria-hidden="true" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--bookora-auth-muted)]" />
              <Input id="verification-email" v-model="email" type="email" autocomplete="email" placeholder="Nhập email của bạn" class="h-11 rounded-lg bg-white pl-10" :disabled="sending" :aria-invalid="Boolean(fieldError)" aria-describedby="verification-email-error" @update:model-value="fieldError = ''" />
            </div>
            <div id="verification-email-error" class="min-h-[18px]"><FieldError :errors="[fieldError || undefined]" class="text-xs leading-[18px]" /></div>
          </Field>
          <Button type="submit" :disabled="sending || remaining > 0" class="h-11 rounded-lg bg-[var(--bookora-green)] text-white hover:bg-[var(--bookora-green-hover)]">{{ sending ? 'Đang gửi...' : remaining > 0 ? `Gửi lại sau ${remaining}s` : 'Gửi lại email xác minh' }}</Button>
        </form>
      </template>
      <RouterLink :to="{ name: 'customer-login' }" class="mt-6 inline-flex items-center gap-2 self-start text-sm font-medium text-[var(--bookora-green)] hover:underline"><ArrowLeft aria-hidden="true" class="size-4" />Quay lại đăng nhập</RouterLink>
    </div>
  </section>
</template>
