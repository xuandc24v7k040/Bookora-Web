<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth.store";
import { useBranchStore } from "@/stores/branch.store";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();

const router = useRouter();
const authStore = useAuthStore();
const branchStore = useBranchStore();

const email = ref("xuandc24v7k040@gmail.com");
const password = ref("password");

async function login(): Promise<void> {
  const loggedIn = authStore.login({
    email: email.value,
    password: password.value,
  });

  if (!loggedIn || !authStore.role) {
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

      <p
        v-if="authStore.loginError"
        class="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {{ authStore.loginError }}
      </p>

      <Field>
        <Button type="submit" class="w-full rounded-xl">Đăng nhập</Button>
      </Field>
    </FieldGroup>
  </form>
</template>
