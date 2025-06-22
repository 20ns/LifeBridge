// Human-in-the-loop review handler for medical-grade quality assurance
// Handles review requests, submissions, and notifications

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createResponse, createErrorResponse, validateRequestBody } from '../utils/response';
import { qualityAssuranceService } from '../services/qualityAssurance';
import { auditLogger } from '../services/auditLogger';
import { impactMetricsService } from '../services/impactMetrics';
import * as crypto from 'crypto';

// Handler for getting pending review requests
export const getPendingReviews = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {}, 'CORS preflight');
    }

    if (event.httpMethod !== 'GET') {
      return createErrorResponse(405, 'Method not allowed');
    }

    // Get query parameters for filtering
    const priority = event.queryStringParameters?.priority as 'low' | 'medium' | 'high' | 'critical';
    const emergency = event.queryStringParameters?.emergency === 'true';

    const pendingReviews = await qualityAssuranceService.getPendingReviews(priority, emergency);

    await auditLogger.logTranslationEvent({
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: 'access',
      severity: 'low',
      sessionId: context.awsRequestId,
      result: 'success'
    });

    return createResponse(200, {
      pendingReviews,
      count: pendingReviews.length,
      emergency: pendingReviews.filter(r => r.priority === 'critical').length
    }, 'Pending reviews retrieved successfully');

  } catch (error) {
    console.error('Get pending reviews error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(500, 'Failed to retrieve pending reviews', errorMessage);
  }
};

// Handler for submitting review results
export const submitReview = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {}, 'CORS preflight');
    }

    if (event.httpMethod !== 'POST') {
      return createErrorResponse(405, 'Method not allowed');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const validation = validateRequestBody(event.body, ['reviewId', 'reviewStatus', 'reviewerId']);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    const { 
      reviewId, 
      reviewStatus, 
      reviewerId, 
      reviewNotes, 
      finalTranslation,
      qualityImprovements 
    } = validation.data;

    // Validate review status
    if (!['approved', 'rejected', 'requires_revision'].includes(reviewStatus)) {
      return createErrorResponse(400, 'Invalid review status');
    }

    // Submit the review
    const reviewResult = await qualityAssuranceService.submitReview(
      reviewId,
      reviewStatus,
      reviewerId,
      reviewNotes,
      finalTranslation
    );

    // Record the review outcome for metrics
    await impactMetricsService.recordComprehensionScore({
      sessionId: reviewResult.sessionId,
      originalScore: reviewResult.originalQuality,
      reviewerScore: reviewResult.reviewerQuality || reviewResult.originalQuality,
      improvementMetrics: qualityImprovements || {
        clarityImprovement: 0,
        accuracyImprovement: 0,
        culturalSensitivityImprovement: 0
      },
      reviewTime: Date.now() - startTime,
      reviewerId,
      emergency: reviewResult.priority === 'critical'
    });

    // Audit log the review submission
    await auditLogger.logTranslationEvent({
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: 'access',
      severity: reviewResult.priority === 'critical' ? 'critical' : 'medium',
      sessionId: reviewResult.sessionId,
      userId: reviewerId,
      result: 'success',
      processing_time_ms: Date.now() - startTime
    });

    return createResponse(200, {
      reviewId,
      status: reviewStatus,
      processingTime: Date.now() - startTime,
      impact: reviewResult.priority === 'critical' ? 'Emergency translation completed' : 'Quality review completed'
    }, `Review ${reviewStatus} successfully`);

  } catch (error) {
    console.error('Submit review error:', error);
    
    await auditLogger.logTranslationEvent({
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: 'access',
      severity: 'high',
      sessionId: context.awsRequestId,
      result: 'failure',
      error_message: error instanceof Error ? error.message : 'Review submission failed',
      processing_time_ms: Date.now() - startTime
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(500, 'Failed to submit review', errorMessage);
  }
};

// Handler for emergency review escalation
export const escalateEmergencyReview = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod !== 'POST') {
      return createErrorResponse(405, 'Method not allowed');
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const validation = validateRequestBody(event.body, ['reviewId', 'escalationReason']);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    const { reviewId, escalationReason, urgentContact } = validation.data;

    // Escalate the review to highest priority
    const escalationResult = await qualityAssuranceService.escalateReview(
      reviewId,
      escalationReason,
      urgentContact
    );

    // Log critical escalation
    await auditLogger.logTranslationEvent({
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: 'emergency',
      severity: 'critical',
      sessionId: context.awsRequestId,
      emergency: true,
      result: 'success',
      error_message: `ESCALATED: ${escalationReason}`
    });

    return createResponse(200, {
      reviewId,
      escalated: true,
      estimatedResponse: '30 seconds',
      notificationsSent: escalationResult.notificationsSent,
      message: 'Emergency review escalated successfully'
    }, 'Emergency review escalated');

  } catch (error) {
    console.error('Emergency escalation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(500, 'Failed to escalate emergency review', errorMessage);
  }
};

// Handler for getting review analytics and metrics
export const getReviewMetrics = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod !== 'GET') {
      return createErrorResponse(405, 'Method not allowed');
    }

    const timeframe = event.queryStringParameters?.timeframe || '24h';
    const metrics = await qualityAssuranceService.getReviewMetrics(timeframe);

    return createResponse(200, {
      timeframe,
      metrics,
      generatedAt: new Date().toISOString()
    }, 'Review metrics retrieved successfully');

  } catch (error) {
    console.error('Get review metrics error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(500, 'Failed to retrieve review metrics', errorMessage);
  }
};
