import {
  authResendEmailVerification,
  authVerifyEmail,
} from "@/api/generated/endpoints/auth/auth";
import type { AuthMutationResponseDto, ResendVerificationResponseDto } from "@/api/generated/models";
import { withAuthCsrfRecovery } from "@/api/http/auth-csrf-request";

export async function verifyEmail(token: string): Promise<AuthMutationResponseDto> {
  const response = await withAuthCsrfRecovery(() => authVerifyEmail({ token }, { skipAuthRefresh: true }));
  return response.data;
}

export async function resendVerification(email: string): Promise<ResendVerificationResponseDto> {
  const response = await withAuthCsrfRecovery(() => authResendEmailVerification({ email }, { skipAuthRefresh: true }));
  return response.data;
}
