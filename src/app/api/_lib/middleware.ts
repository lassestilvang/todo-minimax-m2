/**
 * API Middleware Layer
 * 
 * Authentication, rate limiting, caching, and other middleware utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiContext } from './utils';
import type { 
  ApiContext, 
  RateLimitConfig, 
  RateLimitInfo,
  PermissionResult 
} from './types';

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * In-memory rate limiting store (in production, use Redis or similar)
 */
const rateLimitStore = new Map<string, {
  count: number;
  resetTime: number;
}>();

/**
 * Rate limiting configuration
 */
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // General API rate limits
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: getClientIp
  },
  
  // Strict limits for sensitive endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // Very low for auth endpoints
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
    keyGenerator: getClientIp
  },
  
  // File upload limits
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: getClientIp
  },
  
  // Search limits
  search: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: getClientIp
  },
  
  // Bulk operations limits
  bulk: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: (req) => getClientIp(req)
  }
};

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  req: NextRequest,
  type: keyof typeof RATE_LIMITS = 'general'
): { allowed: boolean; info?: RateLimitInfo; response?: NextResponse } {
  const config = RATE_LIMITS[type];
  const key = config.keyGenerator(req);
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Clean up old entries
  for (const [storeKey, data] of rateLimitStore.entries()) {
    if (data.resetTime < windowStart) {
      rateLimitStore.delete(storeKey);
    }
  }
  
  const existing = rateLimitStore.get(key);
  
  if (!existing) {
    // First request in window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return { 
      allowed: true, 
      info: { 
        limit: config.maxRequests, 
        remaining: config.maxRequests - 1, 
        resetTime: new Date(now + config.windowMs).toISOString() 
      } 
    };
  }
  
  if (existing.resetTime < windowStart) {
    // Window has reset
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return { 
      allowed: true, 
      info: { 
        limit: config.maxRequests, 
        remaining: config.maxRequests - 1, 
        resetTime: new Date(now + config.windowMs).toISOString() 
      } 
    };
  }
  
  if (existing.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((existing.resetTime - now) / 1000);
    return { 
      allowed: false, 
      info: { 
        limit: config.maxRequests, 
        remaining: 0, 
        resetTime: new Date(existing.resetTime).toISOString(),
        retryAfter 
      } 
    };
  }
  
  // Allow request
  existing.count++;
  rateLimitStore.set(key, existing);
  
  return {
    allowed: true,
    info: {
      limit: config.maxRequests,
      remaining: config.maxRequests - existing.count,
      resetTime: new Date(existing.resetTime).toISOString()
    }
  };
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  handler: (req: NextRequest, context: ApiContext) => Promise<NextResponse>,
  type: keyof typeof RATE_LIMITS = 'general'
) {
  return async (req: NextRequest) => {
    const { allowed, info, response } = checkRateLimit(req, type);
    
    if (!allowed) {
      return response || NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Maximum ${info?.limit} requests per window.`,
            statusCode: 429,
            retryAfter: info?.retryAfter
          }
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': info?.limit.toString() || '1000',
            'X-RateLimit-Remaining': info?.remaining.toString() || '0',
            'X-RateLimit-Reset': info?.resetTime || new Date().toISOString(),
            'Retry-After': (info?.retryAfter || 60).toString()
          }
        }
      );
    }
    
    const response = await handler(req, createApiContext(req));
    
    // Add rate limit headers to response
    if (info) {
      response.headers.set('X-RateLimit-Limit', info.limit.toString());
      response.headers.set('X-RateLimit-Remaining', info.remaining.toString());
      response.headers.set('X-RateLimit-Reset', info.resetTime);
    }
    
    return response;
  };
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Authentication result
 */
export interface AuthResult {
  isAuthenticated: boolean;
  userId?: string;
  permissions?: string[];
  role?: 'admin' | 'user' | 'guest';
  error?: string;
}

/**
 * Extract and validate authentication token
 */
function extractAuthToken(req: NextRequest): string | null {
  // Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check custom header for development
  const devToken = req.headers.get('x-auth-token');
  if (devToken) {
    return devToken;
  }
  
  return null;
}

/**
 * Verify authentication token (placeholder implementation)
 */
function verifyAuthToken(token: string): AuthResult {
  // In a real implementation, this would verify JWT tokens, session cookies, etc.
  // For now, we'll use simple token validation
  
  if (token === 'dev-token') {
    return {
      isAuthenticated: true,
      userId: 'dev-user',
      role: 'admin',
      permissions: ['read', 'write', 'admin']
    };
  }
  
  if (token.startsWith('user-')) {
    const userId = token.substring(5);
    return {
      isAuthenticated: true,
      userId,
      role: 'user',
      permissions: ['read', 'write']
    };
  }
  
  return {
    isAuthenticated: false,
    error: 'Invalid or expired token'
  };
}

/**
 * Check authentication for request
 */
export function checkAuthentication(req: NextRequest): AuthResult {
  const token = extractAuthToken(req);
  
  if (!token) {
    return {
      isAuthenticated: false,
      error: 'No authentication token provided'
    };
  }
  
  return verifyAuthToken(token);
}

/**
 * Check if user has required permissions
 */
export function checkPermissions(
  authResult: AuthResult,
  required: string[]
): PermissionResult {
  if (!authResult.isAuthenticated) {
    return {
      allowed: false,
      reason: 'Not authenticated',
      required
    };
  }
  
  const userPermissions = authResult.permissions || [];
  const granted = required.filter(perm => userPermissions.includes(perm));
  const missing = required.filter(perm => !userPermissions.includes(perm));
  
  return {
    allowed: missing.length === 0,
    reason: missing.length > 0 ? `Missing permissions: ${missing.join(', ')}` : undefined,
    required,
    granted
  };
}

/**
 * Authentication middleware
 */
export function withAuth(
  handler: (req: NextRequest, context: ApiContext) => Promise<NextResponse>,
  options?: {
    required?: boolean;
    permissions?: string[];
    allowAnonymous?: boolean;
  }
) {
  return async (req: NextRequest) => {
    const auth = checkAuthentication(req);
    
    // If authentication is not required and user is anonymous
    if (!options?.required && !auth.isAuthenticated) {
      const context: ApiContext = {
        req,
        userId: 'anonymous',
        isAuthenticated: false,
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      };
      return handler(req, context);
    }
    
    // If authentication is required but user is not authenticated
    if (options?.required && !auth.isAuthenticated) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: auth.error || 'Authentication required',
          statusCode: 401,
          suggestions: [
            'Please provide a valid authentication token',
            'Check your Authorization header format',
            'Verify your token has not expired'
          ]
        }
      }, { status: 401 });
    }
    
    // Check permissions if required
    if (options?.permissions && options.permissions.length > 0) {
      const permissionResult = checkPermissions(auth, options.permissions);
      
      if (!permissionResult.allowed) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Insufficient permissions: ${permissionResult.reason}`,
            statusCode: 403,
            suggestions: [
              'Contact an administrator to request access',
              'Check if you have the required role',
              'Verify your user permissions are up to date'
            ]
          }
        }, { status: 403 });
      }
    }
    
    const context: ApiContext = {
      req,
      userId: auth.userId || 'anonymous',
      isAuthenticated: auth.isAuthenticated,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID()
    };
    
    return handler(req, context);
  };
}

// =============================================================================
// CACHING
// =============================================================================

/**
 * Cache entry
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tags?: string[];
}

/**
 * In-memory cache store (in production, use Redis or similar)
 */
const cacheStore = new Map<string, CacheEntry<any>>();

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_SIZE: 1000,
  CLEANUP_INTERVAL: 60 * 1000 // 1 minute
};

/**
 * Clean up expired cache entries
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
  
  // Clean up if cache is too large
  if (cacheStore.size > CACHE_CONFIG.MAX_SIZE) {
    const entries = Array.from(cacheStore.entries())
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    
    const toDelete = entries.slice(0, entries.length - CACHE_CONFIG.MAX_SIZE);
    for (const [key] of toDelete) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Set cache entry
 */
export function setCache<T>(
  key: string,
  data: T,
  ttl?: number,
  tags?: string[]
): void {
  const expiresAt = Date.now() + (ttl || CACHE_CONFIG.DEFAULT_TTL);
  cacheStore.set(key, { data, expiresAt, tags });
}

/**
 * Get cache entry
 */
export function getCache<T>(key: string): T | null {
  cleanupCache();
  
  const entry = cacheStore.get(key);
  if (!entry) {
    return null;
  }
  
  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return null;
  }
  
  return entry.data as T;
}

/**
 * Delete cache entries by tag
 */
export function invalidateCacheByTag(tag: string): void {
  cleanupCache();
  
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.tags?.includes(tag)) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cacheStore.clear();
}

/**
 * Cache middleware
 */
export function withCache(
  handler: (req: NextRequest, context: ApiContext) => Promise<NextResponse>,
  options?: {
    key?: string | ((req: NextRequest, context: ApiContext) => string);
    ttl?: number;
    tags?: string[];
    excludePost?: boolean;
  }
) {
  return async (req: NextRequest, context: ApiContext) => {
    // Skip caching for non-GET requests if configured
    if (options?.excludePost && req.method !== 'GET') {
      return handler(req, context);
    }
    
    // Generate cache key
    let cacheKey: string;
    if (typeof options?.key === 'function') {
      cacheKey = options.key(req, context);
    } else if (typeof options?.key === 'string') {
      cacheKey = options.key;
    } else {
      // Generate default cache key from URL and query params
      const url = new URL(req.url);
      const queryString = url.searchParams.toString();
      cacheKey = `${url.pathname}:${queryString}:${context.userId}`;
    }
    
    // Try to get from cache
    const cachedResponse = getCache<NextResponse>(cacheKey);
    if (cachedResponse) {
      return cachedResponse.clone();
    }
    
    // Execute handler
    const response = await handler(req, context);
    
    // Cache successful GET responses
    if (req.method === 'GET' && response.ok) {
      setCache(cacheKey, response.clone(), options?.ttl, options?.tags);
    }
    
    return response;
  };
}

// =============================================================================
// REQUEST LOGGING
// =============================================================================

/**
 * Log API request
 */
export function logRequest(
  req: NextRequest,
  context: ApiContext,
  response: NextResponse,
  duration?: number
): void {
  const url = new URL(req.url);
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    userId: context.userId,
    status: response.status,
    duration,
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    requestId: context.requestId
  };
  
  // In production, send to logging service
  console.log('[API Request]', JSON.stringify(logData));
}

/**
 * Request logging middleware
 */
export function withLogging(
  handler: (req: NextRequest, context: ApiContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: ApiContext) => {
    const startTime = Date.now();
    
    try {
      const response = await handler(req, context);
      const duration = Date.now() - startTime;
      
      logRequest(req, context, response, duration);
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logRequest(req, context, NextResponse.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          statusCode: 500
        }
      }, { status: 500 }), duration);
      
      throw error;
    }
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get client IP address
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return 'unknown';
}

/**
 * Get request origin for CORS
 */
export function getRequestOrigin(req: NextRequest): string {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  
  if (origin) {
    return origin;
  }
  
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // Ignore invalid referer
    }
  }
  
  return 'unknown';
}

/**
 * Combine multiple middleware
 */
export function composeMiddleware(
  ...middlewares: Array<(handler: any) => any>
) {
  return (handler: (req: NextRequest, context: ApiContext) => Promise<NextResponse>) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Global error handling middleware
 */
export function withErrorHandling(
  handler: (req: NextRequest, context: ApiContext) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: ApiContext) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('[API Error]', {
        error,
        path: new URL(req.url).pathname,
        method: req.method,
        userId: context.userId,
        requestId: context.requestId
      });
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: process.env.NODE_ENV === 'development' 
            ? (error as Error).message 
            : 'Internal server error',
          statusCode: 500,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }
  };
}