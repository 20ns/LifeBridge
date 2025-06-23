#!/usr/bin/env node

// Demo data entry script for LifeBridge Medical Translation Review Dashboard
// Adds realistic medical translation review entries for demonstration

const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const crypto = require('crypto');

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const STAGE = process.env.STAGE || 'dev';
const REVIEW_REQUESTS_TABLE = process.env.REVIEW_REQUESTS_TABLE || `lifebridge-review-requests-${STAGE}`;

const dynamoClient = new DynamoDBClient({ region: AWS_REGION });

// Demo review entries with realistic medical scenarios
const demoReviews = [
  {
    originalText: "Patient has severe chest pain radiating to left arm, difficulty breathing, and is sweating profusely",
    translatedText: "El paciente tiene dolor severo en el pecho que se irradia al brazo izquierdo, dificultad para respirar y está sudando profusamente",
    sourceLanguage: "en",
    targetLanguage: "es", 
    context: "emergency",
    priority: "critical",
    flaggedIssues: ["emergency_terminology", "medical_accuracy_check"],
    qualityMetrics: {
      confidence: 0.92,
      medical_accuracy: 0.95,
      cultural_appropriateness: 0.88,
      emergency_urgency_preserved: true,
      terminology_consistency: 0.91,
      bias_score: 0.12,
      hallucination_risk: 0.08,
      overall_quality: 0.91
    },
    reviewStatus: "pending"
  },
  {
    originalText: "Take 2 tablets of Metformin 500mg twice daily with meals for diabetes management",
    translatedText: "Prendre 2 comprimés de Metformine 500mg deux fois par jour avec les repas pour la gestion du diabète",
    sourceLanguage: "en",
    targetLanguage: "fr",
    context: "medication",
    priority: "high",
    flaggedIssues: ["medication_dosage", "cultural_dietary_considerations"],
    qualityMetrics: {
      confidence: 0.87,
      medical_accuracy: 0.93,
      cultural_appropriateness: 0.75,
      emergency_urgency_preserved: false,
      terminology_consistency: 0.89,
      bias_score: 0.18,
      hallucination_risk: 0.15,
      overall_quality: 0.83
    },
    reviewStatus: "in_review",
    reviewerId: "dr-smith-md",
    reviewNotes: "Need to verify cultural appropriateness for French dietary patterns"
  },
  {
    originalText: "How long have you been experiencing these symptoms? Please describe the pain intensity on a scale of 1-10",
    translatedText: "Wie lange haben Sie diese Symptome schon? Bitte beschreiben Sie die Schmerzintensität auf einer Skala von 1-10",
    sourceLanguage: "en", 
    targetLanguage: "de",
    context: "consultation",
    priority: "medium",
    flaggedIssues: ["pain_scale_cultural_adaptation"],
    qualityMetrics: {
      confidence: 0.94,
      medical_accuracy: 0.91,
      cultural_appropriateness: 0.82,
      emergency_urgency_preserved: false,
      terminology_consistency: 0.93,
      bias_score: 0.09,
      hallucination_risk: 0.05,
      overall_quality: 0.89
    },
    reviewStatus: "approved",
    reviewerId: "nurse-mueller-rn",
    reviewNotes: "Translation approved. German pain scale conventions properly applied.",
    finalTranslation: "Wie lange haben Sie diese Symptome schon? Bitte beschreiben Sie die Schmerzintensität auf einer Skala von 1-10"
  },
  {
    originalText: "Patient requires immediate intubation due to respiratory failure. Call anesthesiology stat!",
    translatedText: "患者因呼吸衰竭需要立即插管。立即呼叫麻醉科！",
    sourceLanguage: "en",
    targetLanguage: "zh",
    context: "emergency", 
    priority: "critical",
    flaggedIssues: ["emergency_protocol", "medical_terminology_verification", "cultural_communication_style"],
    qualityMetrics: {
      confidence: 0.78,
      medical_accuracy: 0.85,
      cultural_appropriateness: 0.71,
      emergency_urgency_preserved: true,
      terminology_consistency: 0.82,
      bias_score: 0.25,
      hallucination_risk: 0.22,
      overall_quality: 0.77
    },
    reviewStatus: "requires_revision",
    reviewerId: "dr-chen-md",
    reviewNotes: "Medical terminology correct but communication style needs adjustment for Chinese healthcare context. 'Stat' should be expressed differently.",
    finalTranslation: "患者因呼吸衰竭需要紧急气管插管。请立即联系麻醉科！"
  },
  {
    originalText: "You are allergic to penicillin. Please inform all healthcare providers about this allergy.",
    translatedText: "Você é alérgico à penicilina. Por favor, informe todos os profissionais de saúde sobre esta alergia.",
    sourceLanguage: "en",
    targetLanguage: "pt",
    context: "consultation",
    priority: "high",
    flaggedIssues: ["allergy_safety_critical", "gender_neutral_language"],
    qualityMetrics: {
      confidence: 0.91,
      medical_accuracy: 0.96,
      cultural_appropriateness: 0.89,
      emergency_urgency_preserved: false,
      terminology_consistency: 0.94,
      bias_score: 0.14,
      hallucination_risk: 0.06,
      overall_quality: 0.92
    },
    reviewStatus: "pending"
  }
];

async function addDemoReview(reviewData) {
  const reviewId = `demo-${crypto.randomBytes(6).toString('hex')}`;
  const timestamp = new Date().toISOString();
  const sessionId = `session-${crypto.randomBytes(4).toString('hex')}`;

  const item = {
    requestId: { S: reviewId },
    timestamp: { S: timestamp },
    sourceLanguage: { S: reviewData.sourceLanguage },
    targetLanguage: { S: reviewData.targetLanguage },
    context: { S: reviewData.context },
    priority: { S: reviewData.priority },
    reviewStatus: { S: reviewData.reviewStatus },
    sessionId: { S: sessionId },
    originalText: { S: reviewData.originalText },
    translatedText: { S: reviewData.translatedText },
    flaggedIssues: { SS: reviewData.flaggedIssues },
    qualityScore: { N: reviewData.qualityMetrics.overall_quality.toString() },
    biasScore: { N: reviewData.qualityMetrics.bias_score.toString() },
    hallucinationRisk: { N: reviewData.qualityMetrics.hallucination_risk.toString() },
    medicalAccuracy: { N: reviewData.qualityMetrics.medical_accuracy.toString() },
    confidence: { N: reviewData.qualityMetrics.confidence.toString() },
    culturalAppropriate: { N: reviewData.qualityMetrics.cultural_appropriateness.toString() },
    emergencyUrgency: { BOOL: reviewData.qualityMetrics.emergency_urgency_preserved },
    terminologyConsistency: { N: reviewData.qualityMetrics.terminology_consistency.toString() }
  };

  // Add optional reviewer fields if present
  if (reviewData.reviewerId) {
    item.reviewerId = { S: reviewData.reviewerId };
  }
  if (reviewData.reviewNotes) {
    item.reviewNotes = { S: reviewData.reviewNotes };
  }
  if (reviewData.finalTranslation) {
    item.finalTranslation = { S: reviewData.finalTranslation };
  }

  const command = new PutItemCommand({
    TableName: REVIEW_REQUESTS_TABLE,
    Item: item
  });

  try {
    await dynamoClient.send(command);
    console.log(`✅ Added demo review entry: ${reviewId}`);
    console.log(`   Context: ${reviewData.context} | Priority: ${reviewData.priority} | Status: ${reviewData.reviewStatus}`);
    console.log(`   Languages: ${reviewData.sourceLanguage} → ${reviewData.targetLanguage}`);
    console.log(`   Quality Score: ${(reviewData.qualityMetrics.overall_quality * 100).toFixed(1)}%`);
    console.log('');
  } catch (error) {
    console.error(`❌ Failed to add demo review entry: ${error.message}`);
    if (error.code === 'ResourceNotFoundException') {
      console.error(`   Table "${REVIEW_REQUESTS_TABLE}" not found. Please check table name or deploy backend first.`);
    }
  }
}

async function main() {
  console.log('🏥 LifeBridge Demo Data Entry - Medical Translation Review Dashboard');
  console.log('================================================================');
  console.log(`Region: ${AWS_REGION}`);
  console.log(`Table: ${REVIEW_REQUESTS_TABLE}`);
  console.log('');

  for (const reviewData of demoReviews) {
    await addDemoReview(reviewData);
    // Small delay to avoid overwhelming DynamoDB
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('🎉 Demo data entry completed!');
  console.log('');
  console.log('📊 Added entries summary:');
  console.log(`   • ${demoReviews.filter(r => r.priority === 'critical').length} Critical priority reviews`);
  console.log(`   • ${demoReviews.filter(r => r.priority === 'high').length} High priority reviews`);
  console.log(`   • ${demoReviews.filter(r => r.priority === 'medium').length} Medium priority reviews`);
  console.log('');
  console.log('📋 Review statuses:');
  console.log(`   • ${demoReviews.filter(r => r.reviewStatus === 'pending').length} Pending review`);
  console.log(`   • ${demoReviews.filter(r => r.reviewStatus === 'in_review').length} In review`);
  console.log(`   • ${demoReviews.filter(r => r.reviewStatus === 'approved').length} Approved`);
  console.log(`   • ${demoReviews.filter(r => r.reviewStatus === 'requires_revision').length} Requires revision`);
  console.log('');
  console.log('🔗 To view the demo data:');
  console.log('   1. Open the LifeBridge frontend application');
  console.log('   2. Navigate to the Review Dashboard');
  console.log('   3. The demo entries should now be visible');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { addDemoReview, demoReviews };
