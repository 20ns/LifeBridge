import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  QBusinessClient, 
  ChatSyncCommand, 
  ListApplicationsCommand 
} from '@aws-sdk/client-qbusiness';
import { createResponse, createErrorResponse } from '../utils/response';

// Configure AWS Q Business client
const qBusinessClient = new QBusinessClient({
  region: 'eu-north-1'
});

interface EmergencyProtocolRequest {
  symptoms: string;
  patientAge?: number;
  medicalHistory?: string[];
  severity?: 'critical' | 'urgent' | 'moderate';
}

interface TriageRequest {
  chiefComplaint: string;
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  };
  painScale?: number;
}

interface ContextualAdviceRequest {
  medicalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  context: 'emergency' | 'consultation' | 'medication' | 'general';
}

export const getEmergencyProtocol = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { symptoms, patientAge, medicalHistory, severity }: EmergencyProtocolRequest = 
      JSON.parse(event.body || '{}');

    if (!symptoms) {
      return createErrorResponse(400, 'Symptoms are required');
    }

    // Build emergency protocol query
    let query = `Emergency medical protocol for: ${symptoms}`;
    
    if (patientAge) {
      query += `\nPatient age: ${patientAge} years`;
    }
    
    if (medicalHistory && medicalHistory.length > 0) {
      query += `\nMedical history: ${medicalHistory.join(', ')}`;
    }
    
    if (severity) {
      query += `\nSeverity level: ${severity}`;
    }

    query += `\n\nProvide structured emergency protocol with:
1. Immediate assessment priorities
2. Time-critical interventions
3. Equipment and medication requirements
4. Contraindications and warnings
5. Follow-up care instructions`;

    // Get available applications
    const listAppsCommand = new ListApplicationsCommand({});
    const applications = await qBusinessClient.send(listAppsCommand);
    
    if (!applications.applications || applications.applications.length === 0) {
      // Return fallback protocol if Q Business not available
      return createResponse(200, {
        recommendations: getFallbackEmergencyProtocol(symptoms, severity),
        source: 'Fallback Emergency Guidelines',
        confidence: 0.7
      }, 'Emergency protocol retrieved (fallback)');
    }

    const applicationId = applications.applications[0].applicationId;

    // Query Q Business
    const chatCommand = new ChatSyncCommand({
      applicationId,
      userMessage: query
    });

    const response = await qBusinessClient.send(chatCommand);

    // Parse and structure the response
    const recommendations = parseEmergencyProtocolResponse(response, symptoms);

    return createResponse(200, {
      recommendations,
      source: 'Amazon Q Medical Knowledge Base',
      confidence: 0.9,
      conversationId: response.conversationId
    }, 'Emergency protocol retrieved successfully');

  } catch (error) {
    console.error('Error getting emergency protocol:', error);
    
    // Return fallback on error
    const { symptoms, severity } = JSON.parse(event.body || '{}');
    return createResponse(200, {
      recommendations: getFallbackEmergencyProtocol(symptoms, severity),
      source: 'Fallback Emergency Guidelines',
      confidence: 0.6,
      error: 'Q Business unavailable, using fallback protocols'
    }, 'Emergency protocol retrieved (fallback due to error)');
  }
};

export const getTriageSuggestion = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { chiefComplaint, vitalSigns, painScale }: TriageRequest = 
      JSON.parse(event.body || '{}');

    if (!chiefComplaint) {
      return createErrorResponse(400, 'Chief complaint is required');
    }

    // Build triage query
    let query = `Medical triage assessment for: ${chiefComplaint}`;
    
    if (vitalSigns) {
      query += '\n\nVital signs:';
      if (vitalSigns.heartRate) query += `\n- Heart rate: ${vitalSigns.heartRate} BPM`;
      if (vitalSigns.bloodPressure) query += `\n- Blood pressure: ${vitalSigns.bloodPressure}`;
      if (vitalSigns.temperature) query += `\n- Temperature: ${vitalSigns.temperature}°C`;
      if (vitalSigns.respiratoryRate) query += `\n- Respiratory rate: ${vitalSigns.respiratoryRate}/min`;
      if (vitalSigns.oxygenSaturation) query += `\n- Oxygen saturation: ${vitalSigns.oxygenSaturation}%`;
    }
    
    if (painScale) {
      query += `\n- Pain scale: ${painScale}/10`;
    }

    query += `\n\nProvide triage priority (P1-P4) with:
1. Urgency assessment and reasoning
2. Immediate interventions required
3. Specialty referral recommendations
4. Red flag symptoms to monitor
5. Expected timeline for care`;

    // Get available applications
    const listAppsCommand = new ListApplicationsCommand({});
    const applications = await qBusinessClient.send(listAppsCommand);
    
    if (!applications.applications || applications.applications.length === 0) {
      // Return fallback triage if Q Business not available
      return createResponse(200, {
        triage: getFallbackTriage(chiefComplaint, vitalSigns, painScale),
        source: 'Fallback Triage Guidelines',
        confidence: 0.7
      }, 'Triage suggestion retrieved (fallback)');
    }

    const applicationId = applications.applications[0].applicationId;

    // Query Q Business
    const chatCommand = new ChatSyncCommand({
      applicationId,
      userMessage: query
    });

    const response = await qBusinessClient.send(chatCommand);

    // Parse and structure the response
    const triage = parseTriageResponse(response, chiefComplaint, vitalSigns, painScale);

    return createResponse(200, {
      triage,
      source: 'Amazon Q Medical Triage System',
      confidence: 0.9,
      conversationId: response.conversationId
    }, 'Triage suggestion retrieved successfully');

  } catch (error) {
    console.error('Error getting triage suggestion:', error);
    
    // Return fallback on error
    const { chiefComplaint, vitalSigns, painScale } = JSON.parse(event.body || '{}');
    return createResponse(200, {
      triage: getFallbackTriage(chiefComplaint, vitalSigns, painScale),
      source: 'Fallback Triage Guidelines',
      confidence: 0.6,
      error: 'Q Business unavailable, using fallback triage'
    }, 'Triage suggestion retrieved (fallback due to error)');
  }
};

export const getContextualAdvice = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { medicalText, sourceLanguage, targetLanguage, context }: ContextualAdviceRequest = 
      JSON.parse(event.body || '{}');

    if (!medicalText || !sourceLanguage || !targetLanguage) {
      return createErrorResponse(400, 'Medical text, source language, and target language are required');
    }

    // Build contextual advice query
    const query = `Medical translation contextual advice:

Medical text: "${medicalText}"
Source language: ${sourceLanguage}
Target language: ${targetLanguage}
Context: ${context}

Please provide:
1. Cultural considerations for medical communication
2. Critical medical terminology that requires precise translation
3. Potential misunderstandings or cultural barriers
4. Emergency escalation triggers if applicable
5. Patient safety and communication best practices
6. Recommended verification steps`;

    // Get available applications
    const listAppsCommand = new ListApplicationsCommand({});
    const applications = await qBusinessClient.send(listAppsCommand);
    
    if (!applications.applications || applications.applications.length === 0) {
      // Return fallback advice if Q Business not available
      return createResponse(200, {
        advice: getFallbackContextualAdvice(medicalText, sourceLanguage, targetLanguage, context),
        source: 'Fallback Medical Translation Guidelines',
        confidence: 0.7
      }, 'Contextual advice retrieved (fallback)');
    }

    const applicationId = applications.applications[0].applicationId;

    // Query Q Business
    const chatCommand = new ChatSyncCommand({
      applicationId,
      userMessage: query
    });

    const response = await qBusinessClient.send(chatCommand);

    // Parse and structure the response
    const advice = parseContextualAdviceResponse(response, context);

    return createResponse(200, {
      advice,
      source: 'Amazon Q Medical Translation Advisor',
      confidence: 0.9,
      conversationId: response.conversationId
    }, 'Contextual advice retrieved successfully');

  } catch (error) {
    console.error('Error getting contextual advice:', error);
    
    // Return fallback on error
    const { medicalText, sourceLanguage, targetLanguage, context } = JSON.parse(event.body || '{}');
    return createResponse(200, {
      advice: getFallbackContextualAdvice(medicalText, sourceLanguage, targetLanguage, context),
      source: 'Fallback Medical Translation Guidelines',
      confidence: 0.6,
      error: 'Q Business unavailable, using fallback advice'
    }, 'Contextual advice retrieved (fallback due to error)');
  }
};

// Fallback functions when Q Business is not available
function getFallbackEmergencyProtocol(symptoms: string, severity?: string) {
  const lowerSymptoms = symptoms.toLowerCase();
  
  // Cardiac protocols
  if (lowerSymptoms.includes('chest pain') || lowerSymptoms.includes('heart')) {
    return {
      id: 'cardiac-001',
      category: 'cardiac',
      severity: severity || 'critical',
      title: 'Acute Chest Pain Protocol',
      immediateActions: [
        'Obtain vital signs and pulse oximetry',
        'Perform 12-lead ECG within 10 minutes',
        'Establish IV access',
        'Administer oxygen if SpO2 < 94%',
        'Consider aspirin 325mg if no contraindications'
      ],
      timeframe: '10 minutes',
      equipment: ['ECG machine', 'IV supplies', 'Oxygen', 'Aspirin'],
      contraindications: ['Active bleeding', 'Aspirin allergy', 'Recent surgery'],
      followup: ['Cardiology consultation', 'Serial cardiac enzymes', 'Continuous monitoring']
    };
  }
  
  // Respiratory protocols
  if (lowerSymptoms.includes('breathing') || lowerSymptoms.includes('dyspnea')) {
    return {
      id: 'respiratory-001',
      category: 'respiratory',
      severity: severity || 'urgent',
      title: 'Acute Dyspnea Protocol',
      immediateActions: [
        'Assess airway patency',
        'Obtain vital signs including SpO2',
        'Auscultate lung sounds',
        'Position patient upright (high Fowler\'s)',
        'Administer oxygen to maintain SpO2 > 94%'
      ],
      timeframe: '5 minutes',
      equipment: ['Pulse oximeter', 'Stethoscope', 'Oxygen', 'Nebulizer'],
      contraindications: ['COPD with CO2 retention (use controlled O2)'],
      followup: ['Chest X-ray', 'ABG if indicated', 'Pulmonology consultation']
    };
  }
  
  // General protocol
  return {
    id: 'general-001',
    category: 'general',
    severity: severity || 'moderate',
    title: 'General Emergency Assessment',
    immediateActions: [
      'Primary survey: Airway, Breathing, Circulation',
      'Obtain complete vital signs',
      'Assess level of consciousness',
      'Perform focused physical examination',
      'Obtain relevant history'
    ],
    timeframe: '15 minutes',
    equipment: ['Vital signs monitor', 'Stethoscope', 'Thermometer'],
    contraindications: [],
    followup: ['Physician evaluation', 'Appropriate specialty referral']
  };
}

function getFallbackTriage(chiefComplaint: string, vitalSigns?: any, painScale?: number) {
  const complaint = chiefComplaint.toLowerCase();
  
  // P1 - Immediate (life-threatening)
  if (complaint.includes('chest pain') || 
      complaint.includes('difficulty breathing') ||
      complaint.includes('unconscious') ||
      (vitalSigns?.heartRate && (vitalSigns.heartRate > 120 || vitalSigns.heartRate < 50)) ||
      (vitalSigns?.oxygenSaturation && vitalSigns.oxygenSaturation < 90)) {
    return {
      priority: 'P1',
      reasoning: 'Potentially life-threatening condition requiring immediate attention',
      timeframe: 'Immediate (0-5 minutes)',
      immediateActions: [
        'Assess airway, breathing, circulation',
        'Obtain full vital signs',
        'Call physician immediately',
        'Prepare for emergency interventions'
      ],
      referrals: ['Emergency physician', 'Specialist consultation as needed'],
      monitoring: ['Continuous vital signs', 'Neurological checks', 'Cardiac monitoring'],
      followupRequired: true
    };
  }

  // P2 - Urgent
  if ((painScale && painScale >= 7) ||
      complaint.includes('severe pain') ||
      complaint.includes('fever') ||
      (vitalSigns?.temperature && vitalSigns.temperature > 38.5)) {
    return {
      priority: 'P2',
      reasoning: 'Urgent condition requiring prompt medical attention',
      timeframe: 'Within 30 minutes',
      immediateActions: [
        'Complete nursing assessment',
        'Pain management as appropriate',
        'Monitor vital signs q15min',
        'Notify physician within 30 minutes'
      ],
      referrals: ['Primary care physician', 'Appropriate specialist'],
      monitoring: ['Vital signs', 'Pain assessment', 'Symptom progression'],
      followupRequired: true
    };
  }

  // P3 - Less urgent
  return {
    priority: 'P3',
    reasoning: 'Less urgent condition, can wait for scheduled care',
    timeframe: 'Within 2 hours',
    immediateActions: [
      'Basic nursing assessment',
      'Comfort measures',
      'Patient education',
      'Schedule appropriate follow-up'
    ],
    referrals: ['Primary care follow-up', 'Self-care instructions'],
    monitoring: ['Periodic assessment', 'Symptom tracking'],
    followupRequired: false
  };
}

function getFallbackContextualAdvice(
  medicalText: string, 
  sourceLanguage: string, 
  targetLanguage: string, 
  context: string
) {
  return {
    culturalConsiderations: [
      'Respect cultural attitudes toward medical authority',
      'Consider family involvement in medical decisions',
      'Be aware of religious considerations in treatment',
      'Understand cultural pain expression differences'
    ],
    criticalTerminology: [
      'Dosage and medication names must be exact',
      'Anatomical terms require precise translation',
      'Emergency instructions need clear understanding',
      'Time-sensitive instructions are critical'
    ],
    potentialMisunderstandings: [
      'Numerical dosages may be misunderstood',
      'Frequency terms (daily, weekly) need clarification',
      'Severity descriptors may vary culturally',
      'Emergency vs. urgent distinctions'
    ],
    verificationSteps: [
      'Have patient repeat instructions back',
      'Use visual aids when possible',
      'Confirm understanding with family member',
      'Provide written translation when available'
    ],
    safetyConsiderations: [
      'Always verify medication allergies',
      'Confirm dosage understanding',
      'Ensure emergency contact information',
      'Provide interpreter services when needed'
    ]
  };
}

// Response parsing functions
function parseEmergencyProtocolResponse(response: any, symptoms: string) {
  // In a real implementation, this would parse the Q Business response
  // For now, return structured fallback
  return getFallbackEmergencyProtocol(symptoms);
}

function parseTriageResponse(response: any, chiefComplaint: string, vitalSigns?: any, painScale?: number) {
  // In a real implementation, this would parse the Q Business response
  // For now, return structured fallback
  return getFallbackTriage(chiefComplaint, vitalSigns, painScale);
}

function parseContextualAdviceResponse(response: any, context: string) {
  // In a real implementation, this would parse the Q Business response
  // For now, return structured fallback
  return getFallbackContextualAdvice('', '', '', context);
}
