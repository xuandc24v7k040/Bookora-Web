<script setup lang="ts">
import type { LoginDto } from "@/api/generated/models";
import type { HTMLAttributes } from "vue";
import { ref } from "vue";
import { useRouter } from "vue-router";
import TurnstileWidget from "@/components/common/TurnstileWidget.vue";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";

type LoginPayload = LoginDto & {
  turnstileToken?: string;
};

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();

const router = useRouter();
const authStore = useAuthStore();
const branchStore = useBranchStore();

const email = ref("xuandc24v7k040@gmail.com");
const password = ref("password");
const turnstileToken = ref("");
const turnstileError = ref<string | null>(null);
const turnstileWidget = ref<InstanceType<typeof TurnstileWidget> | null>(null);

function resetTurnstile(): void {
  if (!env.turnstileEnabled) {
    return;
  }

  turnstileToken.value = "";
  turnstileWidget.value?.reset();
}

function handleTurnstileVerified(token: string): void {
  turnstileToken.value = token;
  turnstileError.value = null;
}

function handleTurnstileExpired(): void {
  turnstileToken.value = "";
}

function handleTurnstileError(): void {
  turnstileToken.value = "";
  turnstileError.value = "Xác minh bảo mật thất bại, vui lòng thử lại.";
}

async function login(): Promise<void> {
  turnstileError.value = null;

  if (env.turnstileEnabled && !turnstileToken.value) {
    turnstileError.value = "Vui lòng hoàn tất xác minh bảo mật.";
    return;
  }

  const payload: LoginPayload = {
    email: email.value,
    password: password.value,
    ...(env.turnstileEnabled ? { turnstileToken: turnstileToken.value } : {}),
  };

  if (import.meta.env.DEV) {
    console.log("Login payload prepared", {
      email: payload.email,
      password: "[redacted]",
      turnstileToken: payload.turnstileToken ? "[redacted]" : undefined,
    });
  }

  const loggedIn = authStore.login({
    email: payload.email,
    password: payload.password,
  });

  if (!loggedIn || !authStore.role) {
    resetTurnstile();
    return;
  }

  if (authStore.role === "SUPER_ADMIN") {
    branchStore.setManagementScope("all");
  } else {
    branchStore.applyAuthContext(authStore.role, authStore.branchId);
  }

  await router.replace(
    authStore.role === "SUPER_ADMIN"
      ? { name: "super-admin-dashboard" }
      : { name: "branch-admin-dashboard" },
  );
}
</script>

<template>
  <form :class="cn('flex flex-col gap-5', props.class)" @submit.prevent="login">
    <FieldGroup>
      <div class="space-y-1.5">
        <h1 class="text-2xl font-semibold tracking-tight">Đăng nhập admin</h1>
        <p class="text-sm leading-5 text-muted-foreground">
          Đăng nhập bằng email mock để hệ thống xác định đúng vai trò và chi
          nhánh.
        </p>
      </div>

      <Field>
        <FieldLabel for="email">Email</FieldLabel>
        <Input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="xuandc24v7k040@gmail.com"
          required
        />
      </Field>

      <Field>
        <FieldLabel for="password">Mật khẩu</FieldLabel>
        <Input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="Nhập mật khẩu"
          required
        />
      </Field>

      <TurnstileWidget
        ref="turnstileWidget"
        @verified="handleTurnstileVerified"
        @expired="handleTurnstileExpired"
        @error="handleTurnstileError"
      />

      <p
        v-if="turnstileError"
        class="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {{ turnstileError }}
      </p>

      <p
        v-if="authStore.loginError"
        class="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {{ authStore.loginError }}
      </p>

      <Field>
        <Button
          type="submit"
          class="w-full rounded-xl"
          :disabled="env.turnstileEnabled && !turnstileToken"
        >
          Đăng nhập
        </Button>
      </Field>
    </FieldGroup>
  </form>
</template>
