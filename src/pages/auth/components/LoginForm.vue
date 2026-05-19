<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminRole } from '@/types/auth.type'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const router = useRouter()
const authStore = useAuthStore()

const email = ref('admin@bookora.local')
const password = ref('password')
const role = ref<AdminRole>('SUPER_ADMIN')

async function login(): Promise<void> {
  authStore.login({
    email: email.value.trim() || 'admin@bookora.local',
    role: role.value,
  })

  await router.replace(
    role.value === 'SUPER_ADMIN'
      ? { name: 'super-admin-dashboard' }
      : { name: 'branch-admin-dashboard' },
  )
}
</script>

<template>
  <form :class="cn('flex flex-col gap-5', props.class)" @submit.prevent="login">
    <FieldGroup>
      <div class="space-y-1.5">
        <h1 class="text-2xl font-semibold tracking-tight">Đăng nhập admin</h1>
        <p class="text-sm leading-5 text-muted-foreground">
          Sử dụng tài khoản demo để truy cập dashboard quản trị Bookora.
        </p>
      </div>

      <Field>
        <FieldLabel for="email">Email</FieldLabel>
        <Input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="admin@bookora.local"
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

      <Field>
        <FieldLabel>Vai trò test</FieldLabel>
        <Select v-model="role">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Chọn vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
              <SelectItem value="BRANCH_ADMIN">BRANCH_ADMIN</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldDescription>
          SUPER_ADMIN vào dashboard hệ thống, BRANCH_ADMIN vào dashboard chi nhánh.
        </FieldDescription>
      </Field>

      <Field>
        <Button type="submit" class="w-full rounded-xl">Đăng nhập</Button>
      </Field>
    </FieldGroup>
  </form>
</template>
