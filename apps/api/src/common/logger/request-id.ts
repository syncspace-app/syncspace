import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

/**
 * Returns a safe request id, stores it on the request, and echoes it on the
 * response so client errors can be matched to server logs.
 */
export function getOrCreateRequestId(
  request: Request,
  response: Response,
): string {
  const incoming = request.headers['x-request-id'];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  const requestId =
    candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();

  request.headers['x-request-id'] = requestId;

  if (!response.headersSent) {
    response.setHeader('x-request-id', requestId);
  }

  return requestId;
}

export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  getOrCreateRequestId(request, response);
  next();
}
