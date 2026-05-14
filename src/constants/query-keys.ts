export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  dashboard: {
    summary: ["dashboard", "summary"] as const,
  },
  ai: {
    semanticSearch: (keyword: string) =>
      ["ai", "semantic-search", keyword] as const,
    recommendations: (userId: string) =>
      ["ai", "recommendations", userId] as const,
    chatHistory: (conversationId: string) =>
      ["ai", "chat", conversationId] as const,
  },
} as const;
