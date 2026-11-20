import { NextResponse } from 'next/server';
import type { ApiResponse } from '@resortos/shared';
import { AppError } from './errors';
import { isProduction } from './env';

export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Converts any thrown error into a consistent API response.
 * Known AppErrors keep their status/code; malformed JSON bodies become 400;
 * anything else is logged and returned as a 500 without leaking internals
 * (database messages, stack details) in production.
 */
export function handleRouteError(
  err: unknown,
  fallbackCode = 'INTERNAL_ERROR',
  fallbackMessage = 'An unexpected error occurred'
): NextResponse<ApiResponse<never>> {
  if (err instanceof AppError) {
    return errorResponse(err.code, err.message, err.statusCode, err.details);
  }

  if (err instanceof SyntaxError) {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  console.error(`[${fallbackCode}]`, err);
  const message = !isProduction && err instanceof Error ? err.message : fallbackMessage;
  return errorResponse(fallbackCode, message, 500);
}
