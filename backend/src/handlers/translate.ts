import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { translateText } from '../services/translate';
import { createResponse, createErrorResponse, validateRequestBody } from '../utils/response';
import { auditLogger } from '../services/auditLogger';
import { qualityAssuranceService } from '../services/qualityAssurance';
import { phiRedactionService } from '../services/phiRedaction';
import { impactMetricsService } from '../services/impactMetrics';
import { offlineService } from '../services/offlineService.core';
import { analyzeMedicalContent } from '../services/medicalTerminology';
import * as crypto from 'crypto';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  const sessionId = crypto.randomUUID();
  
  console.log('Medical-grade translation request:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {}, 'CORS preflight');
    }

    // Validate request method
    if (event.httpMethod !== 'POST') {
      await auditLogger.logTranslationEvent({
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        eventType: 'access',
        severity: 'low',
        sessionId,
        result: 'failure',
        error_message: 'Invalid HTTP method'
      });
      return createErrorResponse(405, 'Method not allowed');
    }

    // Validate request body
    if (!event.body) {
      await auditLogger.logTranslationEvent({
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        eventType: 'access',
        severity: 'low',
        sessionId,
        result: 'failure',
        error_message: 'Missing request body'
      });
      return createErrorResponse(400, 'Request body is required');
    }

    const validation = validateRequestBody(event.body, ['text', 'sourceLanguage', 'targetLanguage']);
    if (!validation.isValid) {
      await auditLogger.logTranslationEvent({
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        eventType: 'access',
        severity: 'medium',
        sessionId,
        result: 'failure',
        error_message: validation.error
      });
      return createErrorResponse(400, validation.error!);
    }    const { text, sourceLanguage, targetLanguage, context, performanceMode = 'standard' } = validation.data;

    // Validate input
    if (!text.trim()) {
      return createErrorResponse(400, 'Text cannot be empty');
    }

    if (text.length > 5000) {
      return createErrorResponse(400, 'Text too long (maximum 5000 characters)');
    }

    // STEP 0: Medical Content Analysis for Criticality Scoring
    console.log('🩺 Analyzing medical content for criticality...');
    const medicalAnalysis = analyzeMedicalContent(text);
    console.log(`🎯 Criticality analysis: Score ${medicalAnalysis.criticalityScore}/100, Emergency: ${medicalAnalysis.isEmergency}, Context: ${medicalAnalysis.recommendedContext}`);

    // STEP 1: PHI Detection and Redaction (HIPAA Compliance)
    console.log('🔒 Starting PHI detection and redaction...');
    const phiResult = await phiRedactionService.detectAndRedactPHI(
      text, 
      context as 'emergency' | 'general' | 'consultation' | 'medication' || 'general'
    );

    // Check if manual review is required for high-risk PHI
    if (phiResult.requiresManualReview) {
      console.log('⚠️ High-risk PHI detected - requires manual review');
      await auditLogger.logTranslationEvent({
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        eventType: 'translation',
        severity: 'high',
        sessionId,
        sourceLanguage,
        targetLanguage,
        textLength: text.length,
        phi_detected: true,
        result: 'partial',
        error_message: 'Manual review required for PHI compliance'
      });
      
      return createResponse(202, {
        status: 'pending_review',
        message: 'Translation requires manual review due to detected PHI',
        reviewId: crypto.randomUUID(),
        estimatedReviewTime: '2-5 minutes'
      });
    }

    // Use redacted text for translation
    const textForTranslation = phiResult.redactedText;
    console.log(`🔒 PHI compliance score: ${phiResult.complianceScore}, Risk: ${phiResult.riskLevel}`);

    // STEP 2: Check Offline Capabilities (Low Connectivity Support)
    const offlineCapabilities = await offlineService.checkOfflineCapabilities(
      textForTranslation,
      sourceLanguage,
      targetLanguage,
      context
    );

    let translationResult;
    const isEmergency = context === 'emergency' || offlineCapabilities.hasEmergencyPhrases;

    if (offlineCapabilities.canHandleOffline && performanceMode === 'optimized') {
      console.log('⚡ Using offline translation for optimized performance');
      translationResult = await offlineService.translateOffline(
        textForTranslation,
        sourceLanguage,
        targetLanguage,
        context
      );
    } else {
      // STEP 3: Perform Online Translation
      console.log(`🧠 Performing online translation: "${textForTranslation}" from ${sourceLanguage} to ${targetLanguage}`);
      translationResult = await translateText(textForTranslation, sourceLanguage, targetLanguage, context, performanceMode);
    }

    // STEP 4: Quality Assurance Assessment
    console.log('🔍 Running quality assurance checks...');
    const qualityResult = await qualityAssuranceService.assessTranslationQuality(
      textForTranslation,
      translationResult.translatedText,
      sourceLanguage,
      targetLanguage,
      context || 'general',
      sessionId
    );

    // Check if human review is required
    if (qualityResult.requiresReview) {
      console.log('👥 Translation flagged for human review');
      
      await auditLogger.logTranslationEvent({
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        eventType: 'translation',
        severity: isEmergency ? 'critical' : 'medium',
        sessionId,
        sourceLanguage,
        targetLanguage,
        textLength: text.length,
        confidence: translationResult.confidence,
        emergency: isEmergency,
        phi_detected: phiResult.detectedPHI.length > 0,
        result: 'partial',
        processing_time_ms: Date.now() - startTime,
        quality_score: qualityResult.qualityMetrics.overall_quality,
        human_review_required: true
      });

      return createResponse(202, {
        status: 'pending_review',
        translatedText: translationResult.translatedText,
        confidence: translationResult.confidence,
        qualityScore: qualityResult.qualityMetrics.overall_quality,
        reviewId: qualityResult.reviewRequest?.requestId || crypto.randomUUID(),
        estimatedReviewTime: isEmergency ? '30 seconds' : '5-10 minutes',
        emergency: isEmergency
      });
    }    // STEP 5: Record Impact Metrics
    await impactMetricsService.recordUsageMetrics({
      sessionId,
      department: 'translation',
      translationCount: 1,
      emergencyTranslations: isEmergency ? 1 : 0,
      totalCharactersTranslated: text.length,
      averageResponseTime: Date.now() - startTime,
      peakUsageTime: new Date().toISOString(),
      languagePairs: [{ source: sourceLanguage, target: targetLanguage, count: 1 }],
      errorCount: 0,
      offlineUsage: offlineCapabilities.canHandleOffline && performanceMode === 'optimized' ? 1 : 0,
      cacheHitRate: offlineCapabilities.canHandleOffline ? 1.0 : 0.0,
      userSatisfactionScore: Math.round(qualityResult.qualityMetrics.overall_quality * 10),
      duration: Math.round((Date.now() - startTime) / 1000)
    });

    // STEP 6: Cache for offline use
    if (!offlineCapabilities.canHandleOffline) {
      await offlineService.cacheTranslation(
        textForTranslation,
        translationResult.translatedText,
        sourceLanguage,
        targetLanguage,
        context,
        translationResult.confidence
      );
    }

    // STEP 7: Comprehensive Audit Logging
    await auditLogger.logTranslationEvent({
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: 'translation',
      severity: isEmergency ? 'critical' : 'medium',
      sessionId,
      sourceLanguage,
      targetLanguage,
      textLength: text.length,
      confidence: translationResult.confidence,
      emergency: isEmergency,
      phi_detected: phiResult.detectedPHI.length > 0,
      ip_address: event.requestContext?.identity?.sourceIp,
      user_agent: event.headers?.['User-Agent'],
      result: 'success',
      processing_time_ms: Date.now() - startTime,
      quality_score: qualityResult.qualityMetrics.overall_quality,
      human_review_required: false
    });    // STEP 8: Prepare Final Response
    const finalResponse = {
      translatedText: translationResult.translatedText,
      confidence: translationResult.confidence,
      detectedLanguage: (translationResult as any).detectedLanguage || sourceLanguage,
      sourceLanguage: (translationResult as any).sourceLanguage || sourceLanguage,
      targetLanguage: (translationResult as any).targetLanguage || targetLanguage,
      method: translationResult.method || 'unknown',
      reasoning: (translationResult as any).reasoning || 'Medical-grade translation completed',
      // Medical-grade metadata
      sessionId,
      qualityScore: qualityResult.qualityMetrics.overall_quality,
      medicalAccuracy: qualityResult.qualityMetrics.medical_accuracy,
      culturalAppropriate: qualityResult.qualityMetrics.cultural_appropriateness,
      emergencyUrgencyPreserved: qualityResult.qualityMetrics.emergency_urgency_preserved,
      phiCompliance: {
        score: phiResult.complianceScore,
        riskLevel: phiResult.riskLevel,
        detectedPHI: phiResult.detectedPHI.length
      },
      offlineCapable: offlineCapabilities.canHandleOffline,
      processingTime: Date.now() - startTime,
      emergency: isEmergency,
      // Medical Analysis (Criticality Scoring)
      medicalAnalysis: {
        containsMedical: medicalAnalysis.containsMedical,
        isEmergency: medicalAnalysis.isEmergency,
        criticalityScore: medicalAnalysis.criticalityScore,
        recommendedContext: medicalAnalysis.recommendedContext,
        modifierContext: medicalAnalysis.modifierContext,
        detectedTerms: medicalAnalysis.detectedTerms.map(term => ({
          term: term.term,
          category: term.category,
          criticality: term.criticality
        }))
      }
    };

    console.log('✅ Medical-grade translation completed successfully:', finalResponse);
    return createResponse(200, finalResponse, 'Medical-grade translation completed successfully');

  } catch (error) {
    console.error('Medical translation handler error:', error);
    
    // Log error with full context
    await auditLogger.logTranslationEvent({
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: 'translation',
      severity: 'critical',
      sessionId,
      result: 'failure',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      processing_time_ms: Date.now() - startTime
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse(500, 'Medical translation failed', errorMessage);
  }
};
