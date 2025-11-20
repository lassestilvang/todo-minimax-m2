/**
 * Base API Configuration and Utilities
 *
 * Core utilities for API route handlers including configuration,
 * common responses, and base functionality
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import type {
  ApiContext,
  PaginatedResponse,
  DetailedApiError,
  ValidationError,
  RateLimitInfo,
} from "./types";
import type { ApiResponse, UserId } from "../../../types/utils";

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * API configuration
 */
export const API_CONFIG = {
  VERSION: "1.0.0" as const,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FORMATS: ["json", "csv", "pdf", "xlsx"] as const,
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 1000,
    SKIP_SUCCESSFUL_REQUESTS: false,
    SKIP_FAILED_REQUESTS: false,
  },
  CACHE: {
    TTL: 5 * 60 * 1000, // 5 minutes
    MAX_SIZE: 1000,
  },
};

// =============================================================================
// REQUEST CONTEXT
// =============================================================================

/**
 * Extract user ID from request (placeholder for authentication)
 */
function extractUserId(req: NextRequest): string {
  // In a real implementation, this would extract from JWT token, session, etc.
  // For now, we'll use a default user ID
  return req.headers.get("x-user-id") || "default-user";
}

/**
 * Check if request is authenticated (placeholder)
 */
function isAuthenticated(req: NextRequest): boolean {
  // In a real implementation, this would verify authentication
  const userId = req.headers.get("x-user-id");
  return !!userId;
}

/**
 * Create API context from NextRequest
 */
export function createApiContext(req: NextRequest): ApiContext {
  const userId = extractUserId(req);
  const isAuth = isAuthenticated(req);
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();

  return {
    req,
    userId: userId as UserId,
    isAuthenticated: isAuth,
    timestamp,
    requestId,
  };
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/**
 * Create success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, any>,
  status: number = 200
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      version: API_CONFIG.VERSION,
      ...meta,
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  },
  meta?: Record<string, any>
): NextResponse {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const hasNextPage = pagination.page < totalPages;
  const hasPreviousPage = pagination.page > 1;

  const paginatedResponse: PaginatedResponse<T> = {
    data,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      version: API_CONFIG.VERSION,
      ...meta,
    },
  };

  return createSuccessResponse(paginatedResponse);
}

/**
 * Create error response
 */
export function createErrorResponse(
  error: DetailedApiError,
  status: number = 500
): NextResponse {
  const response: ApiResponse<null> = {
    success: false,
    error: {
      ...error,
      timestamp: new Date().toISOString(),
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      version: API_CONFIG.VERSION,
    },
  };

  return NextResponse.json(response, { status });
}

// =============================================================================
// ERROR FACTORIES
// =============================================================================

/**
 * Create validation error
 */
export function createValidationError(
  field: string,
  message: string,
  value?: any,
  code: string = "VALIDATION_ERROR"
): DetailedApiError {
  return {
    code,
    message: `Validation failed for field "${field}": ${message}`,
    field,
    details: { value },
    statusCode: 400,
    timestamp: new Date().toISOString(),
    path: "",
    method: "",
    validationErrors: [
      {
        field,
        message,
        code,
        value,
      },
    ],
  };
}

/**
 * Create not found error
 */
export function createNotFoundError(
  resource: string,
  id?: string
): DetailedApiError {
  return {
    code: "NOT_FOUND",
    message: id
      ? `${resource} with ID "${id}" not found`
      : `${resource} not found`,
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: "",
    method: "",
    suggestions: [
      "Check that the resource exists",
      "Verify the ID is correct",
      "Ensure you have permission to access this resource",
    ],
  };
}

/**
 * Create unauthorized error
 */
export function createUnauthorizedError(
  message: string = "Authentication required"
): DetailedApiError {
  return {
    code: "UNAUTHORIZED",
    message,
    statusCode: 401,
    timestamp: new Date().toISOString(),
    path: "",
    method: "",
    suggestions: [
      "Please authenticate with valid credentials",
      "Check that your session has not expired",
      "Verify you have the required permissions",
    ],
  };
}

/**
 * Create forbidden error
 */
export function createForbiddenError(
  message: string = "Insufficient permissions"
): DetailedApiError {
  return {
    code: "FORBIDDEN",
    message,
    statusCode: 403,
    timestamp: new Date().toISOString(),
    path: "",
    method: "",
    suggestions: [
      "Contact an administrator to request access",
      "Verify your user role and permissions",
      "Check if the resource exists and you have access",
    ],
  };
}

/**
 * Create rate limit error
 */
export function createRateLimitError(
  retryAfter: number,
  limit: number
): DetailedApiError {
  return {
    code: "RATE_LIMIT_EXCEEDED",
    message: `Rate limit exceeded. Maximum ${limit} requests per window.`,
    statusCode: 429,
    timestamp: new Date().toISOString(),
    path: "",
    method: "",
    retryAfter,
  };
}

/**
 * Create server error
 */
export function createServerError(
  message: string = "Internal server error",
  details?: Record<string, any>
): DetailedApiError {
  return {
    code: "INTERNAL_ERROR",
    message,
    statusCode: 500,
    timestamp: new Date().toISOString(),
    path: "",
    method: "",
    details,
    suggestions: [
      "Please try again later",
      "If the problem persists, contact support",
      "Check the API documentation for correct usage",
    ],
  };
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate pagination parameters
 */
export function validatePagination(
  page?: string,
  pageSize?: string
): { page: number; pageSize: number; error?: ValidationError } {
  const result = {
    page: 1,
    pageSize: API_CONFIG.DEFAULT_PAGE_SIZE,
  };

  // Validate page
  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return {
        ...result,
        error: {
          field: "page",
          message: "Page must be a positive integer",
          code: "INVALID_PAGE",
          value: page,
        },
      };
    }
    result.page = pageNum;
  }

  // Validate pageSize
  if (pageSize !== undefined) {
    const sizeNum = parseInt(pageSize);
    if (isNaN(sizeNum) || sizeNum < 1 || sizeNum > API_CONFIG.MAX_PAGE_SIZE) {
      return {
        ...result,
        error: {
          field: "pageSize",
          message: `Page size must be between 1 and ${API_CONFIG.MAX_PAGE_SIZE}`,
          code: "INVALID_PAGE_SIZE",
          value: pageSize,
        },
      };
    }
    result.pageSize = sizeNum;
  }

  return result;
}

/**
 * Validate sort parameters
 */
export function validateSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  error?: ValidationError;
} {
  const result: {
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    error?: ValidationError;
  } = {};

  if (sortBy !== undefined && sortBy.trim() === "") {
    return {
      error: {
        field: "sortBy",
        message: "Sort field cannot be empty",
        code: "INVALID_SORT_BY",
        value: sortBy,
      },
    };
  }

  if (sortDirection !== undefined) {
    if (!["asc", "desc"].includes(sortDirection)) {
      return {
        sortBy,
        error: {
          field: "sortDirection",
          message: 'Sort direction must be "asc" or "desc"',
          code: "INVALID_SORT_DIRECTION",
          value: sortDirection,
        },
      };
    }
    result.sortDirection = sortDirection as "asc" | "desc";
  }

  if (sortBy !== undefined) {
    result.sortBy = sortBy;
  }

  return result;
}

/**
 * Validate date range
 */
export function validateDateRange(
  dateFrom?: string,
  dateTo?: string
): { dateFrom?: Date; dateTo?: Date; error?: ValidationError } {
  const result: {
    dateFrom?: Date;
    dateTo?: Date;
    error?: ValidationError;
  } = {};

  if (dateFrom !== undefined) {
    try {
      result.dateFrom = new Date(dateFrom);
      if (isNaN(result.dateFrom.getTime())) {
        return {
          error: {
            field: "dateFrom",
            message: "Invalid date format",
            code: "INVALID_DATE",
            value: dateFrom,
          },
        };
      }
    } catch (error) {
      return {
        error: {
          field: "dateFrom",
          message: "Invalid date format",
          code: "INVALID_DATE",
          value: dateFrom,
        },
      };
    }
  }

  if (dateTo !== undefined) {
    try {
      result.dateTo = new Date(dateTo);
      if (isNaN(result.dateTo.getTime())) {
        return {
          error: {
            field: "dateTo",
            message: "Invalid date format",
            code: "INVALID_DATE",
            value: dateTo,
          },
        };
      }
    } catch (error) {
      return {
        error: {
          field: "dateTo",
          message: "Invalid date format",
          code: "INVALID_DATE",
          value: dateTo,
        },
      };
    }
  }

  // Validate that dateFrom is not after dateTo
  if (result.dateFrom && result.dateTo && result.dateFrom > result.dateTo) {
    return {
      error: {
        field: "dateRange",
        message: "dateFrom cannot be after dateTo",
        code: "INVALID_DATE_RANGE",
        value: { dateFrom, dateTo },
      },
    };
  }

  return result;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Get client IP address from request
 */
export function getClientIp(req: NextRequest): string {
  // Check various headers that might contain the real IP
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return "unknown";
}

/**
 * Check if request is from a bot/crawler
 */
export function isBotRequest(req: NextRequest): boolean {
  const userAgent = req.headers.get("user-agent") || "";
  const botPatterns = [
    "bot",
    "crawler",
    "spider",
    "scraper",
    "googlebot",
    "bingbot",
    "slurp",
    "duckduckbot",
    "baiduspider",
  ];

  const userAgentLower = userAgent.toLowerCase();
  return botPatterns.some((pattern) => userAgentLower.includes(pattern));
}

/**
 * Sanitize string for safe output
 */
export function sanitizeString(str: string): string {
  return str
    .trim()
    .replace(/[<>]/g, "") // Remove < and > to prevent XSS
    .substring(0, 1000); // Limit length
}

/**
 * Parse JSON body safely
 */
export function parseJsonBody<T = any>(body: any): T | null {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (error) {
      return null;
    }
  }
  return body as T;
}

/**
 * Check if content type is JSON
 */
export function isJsonContent(req: NextRequest): boolean {
  const contentType = req.headers.get("content-type") || "";
  return contentType.includes("application/json");
}
