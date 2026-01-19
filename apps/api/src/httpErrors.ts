export function badRequest(message: string, details?: unknown) {
  return {
    error: {
      code: "BAD_REQUEST",
      message,
      details,
    },
  };
}
