export function badRequest(message: string, details?: unknown) {
  return {
    error: {
      code: "BAD_REQUEST",
      message,
      details,
    },
  };
}

export function upstreamError(message: string, details?: unknown) {
  return {
    error: {
      code: "UPSTREAM_ERROR",
      message,
      details,
    },
  };
}

