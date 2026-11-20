import { toBookoraApiError } from "@/api/http/errors";

const messages: Record<string, string> = {
  EMAIL_VERIFICATION_INVALID: "Liên kết xác minh email không hợp lệ.",
  EMAIL_VERIFICATION_EXPIRED: "Liên kết xác minh email đã hết hạn. Vui lòng yêu cầu gửi lại.",
  EMAIL_VERIFICATION_USED: "Liên kết này đã được sử dụng. Vui lòng đăng nhập hoặc yêu cầu gửi lại.",
  EMAIL_VERIFICATION_REVOKED: "Liên kết này không còn hiệu lực. Vui lòng dùng email mới nhất.",
  EMAIL_VERIFICATION_ALREADY_VERIFIED: "Email đã được xác minh. Vui lòng đăng nhập.",
  EMAIL_VERIFICATION_RATE_LIMITED: "Có quá nhiều yêu cầu. Vui lòng chờ trước khi gửi lại.",
  CSRF_INVALID: "Phiên bảo mật không hợp lệ. Vui lòng thử lại.",
};

export function emailVerificationError(error: unknown): { message: string; retryable: boolean; rateLimited: boolean } {
  const api = toBookoraApiError(error);
  return {
    message: messages[api.code ?? ""] ?? (api.statusCode === 429
      ? messages.EMAIL_VERIFICATION_RATE_LIMITED!
      : "Không thể xác minh hoặc gửi email lúc này. Vui lòng kiểm tra kết nối và thử lại."),
    retryable: !api.statusCode || api.statusCode >= 500 || api.statusCode === 429 || api.code === "CSRF_INVALID",
    rateLimited: api.statusCode === 429,
  };
}
