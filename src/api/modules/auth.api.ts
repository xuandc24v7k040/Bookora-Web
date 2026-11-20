import {
  authLogin,
  authLogout,
  authMe,
  authRegister,
} from '@/api/generated/endpoints/auth/auth'
import type {
  AuthMeResponseDto,
  AuthMutationResponseDto,
  LoginDto,
  PublicAuthUserResponseDto,
  RegisterDto,
  RegistrationResponseDto,
} from '@/api/generated/models'
import type { AxiosRequestConfig } from 'axios'
import { getCsrfToken } from '@/api/http/csrf-manager'
import { withAuthCsrfRecovery } from '@/api/http/auth-csrf-request'

export type FetchCurrentUserOptions = Pick<
  AxiosRequestConfig,
  'skipAuthRefresh'
>

export async function loginWithPassword(
  payload: LoginDto,
): Promise<PublicAuthUserResponseDto> {
  await getCsrfToken()
  const response = await withAuthCsrfRecovery(() => authLogin(payload))
  return response.data
}

export async function registerCustomer(
  payload: RegisterDto,
): Promise<RegistrationResponseDto> {
  await getCsrfToken()
  const response = await withAuthCsrfRecovery(() => authRegister(payload))
  return response.data
}

export async function fetchCurrentUser(
  options?: FetchCurrentUserOptions,
): Promise<AuthMeResponseDto> {
  const response = await authMe(options)
  return response.data
}

export async function logoutCurrentAccount(): Promise<AuthMutationResponseDto> {
  const response = await authLogout()
  return response.data
}

export const authApi = {
  loginWithPassword,
  registerCustomer,
  fetchCurrentUser,
  logoutCurrentAccount,
}
