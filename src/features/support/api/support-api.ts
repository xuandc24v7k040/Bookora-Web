import type { AxiosRequestConfig } from "axios";
import type {
  SupportCreateDto,
  SupportMessageInputDto,
  SupportTicketsListParams,
  SupportUploadBodyDto,
} from "@/api/generated/models";
import * as api from "@/api/generated/endpoints/support/support";

export interface SupportScope {
  key: string;
  userId: string;
  branchId: string | null;
}
export const supportKeys = {
  all: ["support-chat"] as const,
  scope: (scope: SupportScope) => ["support-chat", scope.key] as const,
  list: (scope: SupportScope, params: SupportTicketsListParams) =>
    ["support-chat", scope.key, "list", params] as const,
  detail: (scope: SupportScope, id: string) =>
    ["support-chat", scope.key, "detail", id] as const,
  context: (scope: SupportScope, id: string) =>
    ["support-chat", scope.key, "context", id] as const,
};
export function supportRequest(
  scope: SupportScope,
  signal?: AbortSignal,
): AxiosRequestConfig {
  return {
    signal,
    ...(scope.branchId
      ? { branchScoped: true, headers: { "X-Branch-Id": scope.branchId } }
      : {}),
  };
}
export const listTickets = (
  scope: SupportScope,
  params: SupportTicketsListParams,
  signal?: AbortSignal,
) =>
  api
    .supportTicketsList(params, supportRequest(scope), signal)
    .then((r) => r.data);
export const getTicket = (
  scope: SupportScope,
  id: string,
  signal?: AbortSignal,
) =>
  api
    .supportTicketDetail(id, supportRequest(scope), signal)
    .then((r) => r.data);
export const getUnread = (scope: SupportScope, signal?: AbortSignal) =>
  api.supportUnread(supportRequest(scope), signal).then((r) => r.data);
export const getMessages = (
  scope: SupportScope,
  id: string,
  params: { beforeSequence?: number; afterSequence?: number; limit?: number },
  signal?: AbortSignal,
) =>
  api
    .supportMessagesList(id, params, supportRequest(scope), signal)
    .then((r) => r.data);
export const createTicket = (
  scope: SupportScope,
  payload: SupportCreateDto,
  signal?: AbortSignal,
) =>
  api
    .supportTicketCreate(payload, supportRequest(scope, signal))
    .then((r) => r.data);
export const sendMessage = (
  scope: SupportScope,
  id: string,
  payload: SupportMessageInputDto,
  signal?: AbortSignal,
) =>
  api
    .supportMessageSend(id, payload, supportRequest(scope, signal))
    .then((r) => r.data);
export const readTicket = (
  scope: SupportScope,
  id: string,
  sequence: number,
  signal?: AbortSignal,
) =>
  api
    .supportTicketRead(
      id,
      { lastReadSequence: sequence },
      supportRequest(scope, signal),
    )
    .then((r) => r.data);
export const uploadAttachment = (
  scope: SupportScope,
  payload: SupportUploadBodyDto,
  options: AxiosRequestConfig,
) =>
  api
    .supportAttachmentUpload(payload, { ...supportRequest(scope), ...options })
    .then((r) => r.data);
export const discardAttachment = (id: string) =>
  api.supportAttachmentDiscard(id);
export const attachmentContent = (
  scope: SupportScope,
  id: string,
  signal?: AbortSignal,
) => api.supportAttachmentContent(id, supportRequest(scope), signal);
export const ownedOrderContext = (id: string, signal?: AbortSignal) =>
  api.supportOwnedOrderContext(id, undefined, signal).then((r) => r.data);
export const ticketOrderContext = (
  scope: SupportScope,
  id: string,
  signal?: AbortSignal,
) =>
  api
    .supportTicketOrderContext(id, supportRequest(scope), signal)
    .then((r) => r.data);
export const listActivities = (
  scope: SupportScope,
  id: string,
  cursor?: string,
  signal?: AbortSignal,
) =>
  api
    .supportTicketActivities(
      id,
      { cursor: cursor ?? "" },
      supportRequest(scope),
      signal,
    )
    .then((r) => r.data);
export type SupportAction =
  | "claim"
  | "unclaim"
  | "resolve"
  | "reopen"
  | "reassign";
export function changeTicket(
  scope: SupportScope,
  id: string,
  action: SupportAction,
  assigneeId?: string,
  signal?: AbortSignal,
) {
  const options = supportRequest(scope, signal);
  switch (action) {
    case "claim":
      return api.supportTicketClaim(id, options).then((r) => r.data);
    case "unclaim":
      return api.supportTicketUnclaim(id, options).then((r) => r.data);
    case "resolve":
      return api.supportTicketResolve(id, options).then((r) => r.data);
    case "reopen":
      return api.supportTicketReopen(id, options).then((r) => r.data);
    case "reassign":
      return api
        .supportTicketReassign(id, { assigneeId: assigneeId ?? "" }, options)
        .then((r) => r.data);
  }
}
export const listAssignees = (
  scope: SupportScope,
  query?: string,
  cursor?: string,
  signal?: AbortSignal,
) =>
  api
    .supportAssigneesList({ query, cursor }, supportRequest(scope), signal)
    .then((r) => r.data);
