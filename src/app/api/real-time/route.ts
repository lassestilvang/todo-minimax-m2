/**
 * Real-time Updates API Route Handler
 * 
 * Handles real-time updates using Server-Sent Events (SSE)
 * GET /api/real-time - Establish SSE connection for live updates
 * POST /api/real-time - Broadcast updates to connected clients
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbAPI } from '../../../lib/db/api';
import { 
  withAuth, 
  withRateLimit, 
  withErrorHandling 
} from '../_lib/middleware';
import { 
  createSuccessResponse,
  createValidationError 
} from '../_lib/utils';
import { 
  websocketMessageSchema 
} from '../_lib/validation';
import type { ApiContext, RealtimeMessage, TaskUpdateMessage } from '../_lib/types';

// Apply middleware stack
const handler = withErrorHandling(
  withRateLimit(
    withAuth(async (req: NextRequest, context: ApiContext) => {
      if (req.method === 'GET') {
        return handleEstablishConnection(req, context);
      } else if (req.method === 'POST') {
        return handleBroadcastUpdate(req, context);
      } else {
        return NextResponse.json({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${req.method} not allowed`,
            statusCode: 405
          }
        }, { status: 405 });
      }
    })
  )
);

export { handler as GET, handler as POST };

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

/**
 * Store active connections (in production, use Redis or similar)
 */
const activeConnections = new Map<string, {
  userId: string;
  response: ReadableStream;
  controller: ReadableStreamDefaultController;
  timestamp: number;
}>();

// =============================================================================
// GET /api/real-time - Establish SSE connection for live updates
// =============================================================================

async function handleEstablishConnection(req: NextRequest, context: ApiContext): Promise<NextResponse> {
  try {
    // Generate unique connection ID
    const connectionId = `${context.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Store connection
        activeConnections.set(connectionId, {
          userId: context.userId,
          response: stream,
          controller,
          timestamp: Date.now()
        });

        // Send initial connection message
        const welcomeMessage = {
          type: 'connection_established' as const,
          payload: {
            connectionId,
            timestamp: new Date().toISOString(),
            message: 'Real-time connection established'
          },
          timestamp: new Date().toISOString(),
          userId: context.userId
        };

        controller.enqueue(encodeSSEEvent(welcomeMessage));

        // Send initial data
        sendInitialData(controller, context.userId);

        // Set up heartbeat
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = {
              type: 'ping' as const,
              payload: { timestamp: new Date().toISOString() },
              timestamp: new Date().toISOString(),
              userId: context.userId
            };
            controller.enqueue(encodeSSEEvent(heartbeat));
          } catch (error) {
            console.error('[Real-time API] Error sending heartbeat:', error);
            clearInterval(heartbeatInterval);
            activeConnections.delete(connectionId);
          }
        }, 30000); // Send heartbeat every 30 seconds

        // Clean up on stream close
        const cleanup = () => {
          clearInterval(heartbeatInterval);
          activeConnections.delete(connectionId);
          console.log(`[Real-time API] Connection ${connectionId} closed for user ${context.userId}`);
        };

        // Handle stream termination
        (stream as any).cleanup = cleanup;
      },
      
      cancel() {
        activeConnections.delete(connectionId);
        console.log(`[Real-time API] Connection ${connectionId} cancelled for user ${context.userId}`);
      }
    });

    // Return SSE response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error('[Real-time API] Error establishing connection:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'CONNECTION_ERROR',
        message: 'Failed to establish real-time connection',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// =============================================================================
// POST /api/real-time - Broadcast updates to connected clients
// =============================================================================

async function handleBroadcastUpdate(req: NextRequest, context: ApiContext): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = await req.json();
    const validation = websocketMessageSchema.safeParse(body);

    if (!validation.success) {
      const validationError = validation.error.errors[0];
      const error = createValidationError(
        validationError.path.join('.'),
        validationError.message,
        validationError.input,
        'VALIDATION_ERROR'
      );
      
      return NextResponse.json({
        success: false,
        error: {
          ...error,
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    const message: RealtimeMessage = validation.data;

    // Verify user can broadcast this type of message
    if (message.userId !== context.userId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot broadcast for another user',
          statusCode: 403,
          timestamp: new Date().toISOString()
        }
      }, { status: 403 });
    }

    // Broadcast message to appropriate connections
    const connections = Array.from(activeConnections.values());
    let deliveredCount = 0;

    for (const connection of connections) {
      // Check if connection should receive this message
      if (shouldDeliverMessage(message, connection)) {
        try {
          const encodedMessage = encodeSSEEvent(message);
          connection.controller.enqueue(encodedMessage);
          deliveredCount++;
        } catch (error) {
          console.error('[Real-time API] Error delivering message to connection:', error);
          // Remove failed connection
          const connectionId = Array.from(activeConnections.entries())
            .find(([_, conn]) => conn === connection)?.[0];
          if (connectionId) {
            activeConnections.delete(connectionId);
          }
        }
      }
    }

    // Log broadcast activity
    console.log(`[Real-time API] Broadcasted ${message.type} to ${deliveredCount} connections`);

    return createSuccessResponse({
      message: 'Update broadcasted successfully',
      deliveredTo: deliveredCount,
      totalConnections: connections.length
    }, {
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Real-time API] Error broadcasting update:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'BROADCAST_ERROR',
        message: 'Failed to broadcast update',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Encode message as SSE event
 */
function encodeSSEEvent(message: RealtimeMessage): Uint8Array {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  return new TextEncoder().encode(data);
}

/**
 * Send initial data to newly connected client
 */
async function sendInitialData(controller: ReadableStreamDefaultController, userId: string): Promise<void> {
  try {
    // Get user's recent activity
    const [recentTasks, recentLists] = await Promise.all([
      dbAPI.getUserTasks(userId, {}).then(tasks => tasks.slice(0, 10)),
      dbAPI.getUserListsWithCounts(userId).then(lists => lists.slice(0, 5))
    ]);

    // Send initial task data
    const initialTasksMessage = {
      type: 'initial_data' as const,
      payload: {
        recentTasks,
        recentLists,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      userId
    };

    controller.enqueue(encodeSSEEvent(initialTasksMessage));

  } catch (error) {
    console.error('[Real-time API] Error sending initial data:', error);
  }
}

/**
 * Determine if message should be delivered to connection
 */
function shouldDeliverMessage(message: RealtimeMessage, connection: any): boolean {
  // Always deliver system messages and pings
  if (['ping', 'pong', 'notification', 'system'].includes(message.type)) {
    return true;
  }

  // For task/list/label updates, only deliver to the owner
  if (message.type.includes('task') || message.type.includes('list') || message.type.includes('label')) {
    return message.userId === connection.userId;
  }

  // For room-based messages, check room membership
  if (message.roomId) {
    // In a real implementation, you'd check room membership from database
    return true; // Simplified for now
  }

  // Default: deliver to all connections (with user filtering)
  return true;
}

/**
 * Clean up stale connections
 */
function cleanupStaleConnections(): void {
  const now = Date.now();
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  
  for (const [connectionId, connection] of activeConnections.entries()) {
    if (now - connection.timestamp > staleThreshold) {
      activeConnections.delete(connectionId);
      console.log(`[Real-time API] Cleaned up stale connection: ${connectionId}`);
    }
  }
}

// =============================================================================
// TASK UPDATE BROADCASTING
// =============================================================================

/**
 * Broadcast task update to relevant connections
 */
export async function broadcastTaskUpdate(taskUpdate: TaskUpdateMessage): Promise<void> {
  const message: RealtimeMessage = {
    type: 'task_updated',
    payload: taskUpdate,
    timestamp: new Date().toISOString(),
    userId: taskUpdate.userId
  };

  // Find all connections that should receive this update
  for (const connection of activeConnections.values()) {
    if (shouldDeliverMessage(message, connection)) {
      try {
        const encodedMessage = encodeSSEEvent(message);
        connection.controller.enqueue(encodedMessage);
      } catch (error) {
        console.error('[Real-time API] Error broadcasting task update:', error);
      }
    }
  }
}

/**
 * Broadcast notification to user
 */
export async function broadcastNotification(userId: string, notification: any): Promise<void> {
  const message: RealtimeMessage = {
    type: 'notification',
    payload: {
      ...notification,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString(),
    userId
  };

  // Find connections for this user
  for (const connection of activeConnections.values()) {
    if (connection.userId === userId) {
      try {
        const encodedMessage = encodeSSEEvent(message);
        connection.controller.enqueue(encodedMessage);
      } catch (error) {
        console.error('[Real-time API] Error broadcasting notification:', error);
      }
    }
  }
}

// =============================================================================
// CONNECTION MANAGEMENT UTILITIES
// =============================================================================

/**
 * Get active connection count
 */
export function getActiveConnectionCount(): number {
  cleanupStaleConnections();
  return activeConnections.size;
}

/**
 * Get connection statistics
 */
export function getConnectionStats() {
  const userConnections = new Map<string, number>();
  
  for (const connection of activeConnections.values()) {
    const count = userConnections.get(connection.userId) || 0;
    userConnections.set(connection.userId, count + 1);
  }

  return {
    totalConnections: activeConnections.size,
    uniqueUsers: userConnections.size,
    userConnectionCounts: Object.fromEntries(userConnections)
  };
}

/**
 * Force disconnect user connections
 */
export function disconnectUser(userId: string): number {
  let disconnected = 0;
  
  for (const [connectionId, connection] of activeConnections.entries()) {
    if (connection.userId === userId) {
      activeConnections.delete(connectionId);
      disconnected++;
    }
  }
  
  return disconnected;
}

// Set up periodic cleanup
setInterval(cleanupStaleConnections, 60000); // Clean up every minute