import axios from "axios";

const messages: Record<string, string> = {
  SUPPORT_REPLY_INVALID:
    "Tin nhắn được trả lời không còn khả dụng trong hội thoại này.",
  SUPPORT_TICKET_ALREADY_CLAIMED:
    "Hội thoại đã được nhân viên khác tiếp nhận. Trạng thái đã được cập nhật.",
  SUPPORT_ASSIGNEE_INVALID:
    "Nhân viên không còn đủ quyền hỗ trợ. Vui lòng chọn lại.",
  SUPPORT_TICKET_RESOLVED:
    "Yêu cầu đã giải quyết. Khách hàng cần chủ động tiếp tục hỗ trợ.",
  SUPPORT_MESSAGE_REPLAY_CONFLICT:
    "Mã gửi đã gắn với nội dung khác. Vui lòng kiểm tra lại hội thoại.",
  SUPPORT_FORBIDDEN: "Bạn không còn quyền thực hiện thao tác này.",
  SUPPORT_TICKET_NOT_FOUND:
    "Yêu cầu không còn truy cập được trong phạm vi hiện tại.",
  SUPPORT_ATTACHMENT_INVALID:
    "Tệp không hợp lệ hoặc đã hết hạn. Vui lòng chọn lại tệp.",
  SUPPORT_ATTACHMENT_TOO_LARGE: "Mỗi tệp tối đa 10 MiB.",
  SUPPORT_UPLOAD_LIMIT:
    "Đã đạt giới hạn tệp chờ gửi. Hãy gửi hoặc bỏ các tệp đang chọn.",
  SUPPORT_BRANCH_UNAVAILABLE:
    "Chi nhánh hiện không tiếp nhận yêu cầu mới. Bạn có thể chọn chi nhánh khác để tư vấn chung.",
};
export function supportError(error: unknown): string {
  if (axios.isAxiosError<{ code?: string }>(error)) {
    if (error.response?.status === 401)
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.response?.status === 429)
      return "Thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.";
    const code = error.response?.data?.code;
    if (code && messages[code]) return messages[code];
    if (error.response?.status === 403) return messages.SUPPORT_FORBIDDEN!;
    if (error.response?.status === 404)
      return messages.SUPPORT_TICKET_NOT_FOUND!;
  }
  return "Chưa thể hoàn tất thao tác. Kiểm tra kết nối và thử lại; nội dung của bạn được giữ lại.";
}
export function isSupportAccessError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    [401, 403, 404].includes(error.response?.status ?? 0)
  );
}
