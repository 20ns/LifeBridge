import { 
  QBusinessClient, 
  ChatSyncCommand, 
  ListConversationsCommand,
  ListApplicationsCommand,
  GetApplicationCommand
} from '@aws-sdk/client-qbusiness';
import { AWS_REGION } from '../config';

// Configure AWS Q Business client
const qBusinessClient = new QBusinessClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || ''
  }
});

export interface EmergencyProtocol {
  id: string;
  category: 'cardiac' | 'respiratory' | 'neurological' | 'trauma' | 'pediatric' | 'obstetric';
  severity: 'critical' | 'urgent' | 'moderate';
  title: string;
  steps: string[];
  timeframe: string;
  contraindications: string[];
  resources: string[];
}

export interface QRecommendation {
  confidence: number;
  source: string;
  title: string;
  content: string;
  protocol?: EmergencyProtocol;
  relatedActions: string[];
}

export interface TriageSuggestion {
  priority: 'P1' | 'P2' | 'P3' | 'P4'; // Emergency triage priorities
  reasoning: string;
  immediateActions: string[];
  referralRecommendations: string[];
  followupRequired: boolean;
}

class AmazonQService {
  private applicationId: string | undefined;
  private conversationId: string | undefined;

  // Initialize Q Business application
  async initialize(): Promise<boolean> {
    try {
      // List available applications
      const listCommand = new ListApplicationsCommand({});
      const applications = await qBusinessClient.send(listCommand);
      
      // Use the first available application or create one for medical protocols
      if (applications.applications && applications.applications.length > 0) {
        this.applicationId = applications.applications[0].applicationId;
        return true;
      }
      
      console.warn('No Q Business applications found');
      return false;
    } catch (error) {
      console.error('Failed to initialize Amazon Q:', error);
      return false;
    }
  }

  // Query emergency protocols based on symptoms/situation
  async getEmergencyProtocol(
    symptoms: string,
    patientAge?: number,
    medicalHistory?: string[]
  ): Promise<QRecommendation[]> {
    if (!this.applicationId) {
      await this.initialize();
    }    try {
      const query = this.buildEmergencyQuery(symptoms, patientAge, medicalHistory);
      
      const chatCommand = new ChatSyncCommand({
        applicationId: this.applicationId,
        userMessage: query,
        conversationId: this.conversationId
      });

      const response = await qBusinessClient.send(chatCommand);
      this.conversationId = response.conversationId;

      return this.parseEmergencyResponse(response);
    } catch (error) {
      console.error('Error querying emergency protocols:', error);
      // Return fallback recommendations
      return this.getFallbackProtocols(symptoms);
    }
  }

  // Get triage suggestions based on patient presentation
  async getTriageSuggestion(
    chiefComplaint: string,
    vitalSigns?: {
      heartRate?: number;
      bloodPressure?: string;
      temperature?: number;
      respiratoryRate?: number;
      oxygenSaturation?: number;
    },
    painScale?: number
  ): Promise<TriageSuggestion> {
    if (!this.applicationId) {
      await this.initialize();
    }

    try {      const query = this.buildTriageQuery(chiefComplaint, vitalSigns, painScale);
      
      const chatCommand = new ChatSyncCommand({
        applicationId: this.applicationId,
        userMessage: query,
        conversationId: this.conversationId
      });

      const response = await qBusinessClient.send(chatCommand);
      this.conversationId = response.conversationId;

      return this.parseTriageResponse(response, chiefComplaint, vitalSigns, painScale);
    } catch (error) {
      console.error('Error getting triage suggestion:', error);
      return this.getFallbackTriage(chiefComplaint, vitalSigns, painScale);
    }
  }

  // Get contextual medical advice for translation
  async getContextualAdvice(
    medicalText: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: 'emergency' | 'consultation' | 'medication' | 'general'
  ): Promise<QRecommendation[]> {
    if (!this.applicationId) {
      await this.initialize();
    }

    try {
      const query = `
        Provide contextual medical advice for this ${context} scenario:
        
        Medical text: "${medicalText}"
        Source language: ${sourceLanguage}
        Target language: ${targetLanguage}
        
        Please provide:
        1. Cultural considerations for medical communication
        2. Important medical terminology that must be translated accurately
        3. Potential misunderstandings to avoid
        4. Emergency escalation triggers if applicable
        5. Patient safety considerations
      `;
        const chatCommand = new ChatSyncCommand({
        applicationId: this.applicationId,
        userMessage: query,
        conversationId: this.conversationId
      });

      const response = await qBusinessClient.send(chatCommand);
      this.conversationId = response.conversationId;

      return this.parseContextualResponse(response);
    } catch (error) {
      console.error('Error getting contextual advice:', error);
      return [];
    }
  }

  // Build emergency protocol query
  private buildEmergencyQuery(
    symptoms: string,
    patientAge?: number,
    medicalHistory?: string[]
  ): string {
    let query = `Emergency medical protocol query:

Symptoms: ${symptoms}`;

    if (patientAge) {
      query += `\nPatient age: ${patientAge} years`;
    }

    if (medicalHistory && medicalHistory.length > 0) {
      query += `\nMedical history: ${medicalHistory.join(', ')}`;
    }

    query += `

Please provide:
1. Immediate assessment priorities
2. Emergency treatment protocols
3. Critical care interventions
4. Time-sensitive actions
5. Contraindications and warnings
6. Equipment/medication requirements`;

    return query;
  }

  // Build triage query
  private buildTriageQuery(
    chiefComplaint: string,
    vitalSigns?: any,
    painScale?: number
  ): string {
    let query = `Medical triage assessment:

Chief complaint: ${chiefComplaint}`;

    if (vitalSigns) {
      query += '\nVital signs:';
      if (vitalSigns.heartRate) query += `\n- Heart rate: ${vitalSigns.heartRate} BPM`;
      if (vitalSigns.bloodPressure) query += `\n- Blood pressure: ${vitalSigns.bloodPressure}`;
      if (vitalSigns.temperature) query += `\n- Temperature: ${vitalSigns.temperature}°C`;
      if (vitalSigns.respiratoryRate) query += `\n- Respiratory rate: ${vitalSigns.respiratoryRate}/min`;
      if (vitalSigns.oxygenSaturation) query += `\n- Oxygen saturation: ${vitalSigns.oxygenSaturation}%`;
    }

    if (painScale) {
      query += `\nPain scale: ${painScale}/10`;
    }

    query += `

Please provide triage priority (P1-P4) and:
1. Urgency assessment
2. Immediate interventions needed
3. Specialty referral requirements
4. Follow-up care recommendations
5. Red flag symptoms to monitor`;

    return query;
  }

  // Parse emergency protocol response
  private parseEmergencyResponse(response: any): QRecommendation[] {
    // This would parse the Q Business response
    // For now, returning structured example
    const recommendations: QRecommendation[] = [];
    
    if (response.systemMessage) {
      recommendations.push({
        confidence: 0.85,
        source: 'Amazon Q Medical Knowledge Base',
        title: 'Emergency Protocol Recommendation',
        content: response.systemMessage,
        relatedActions: ['assess_airway', 'check_vitals', 'call_specialist']
      });
    }

    return recommendations;
  }

  // Parse triage response
  private parseTriageResponse(
    response: any,
    chiefComplaint: string,
    vitalSigns?: any,
    painScale?: number
  ): TriageSuggestion {
    // Parse Q Business response for triage
    // This is a simplified implementation
    return this.getFallbackTriage(chiefComplaint, vitalSigns, painScale);
  }

  // Parse contextual advice response
  private parseContextualResponse(response: any): QRecommendation[] {
    const recommendations: QRecommendation[] = [];
    
    if (response.systemMessage) {
      recommendations.push({
        confidence: 0.8,
        source: 'Amazon Q Cultural Medical Guide',
        title: 'Translation Context Advice',
        content: response.systemMessage,
        relatedActions: ['verify_understanding', 'use_interpreter', 'check_cultural_sensitivity']
      });
    }

    return recommendations;
  }

  // Fallback emergency protocols when Q is unavailable
  private getFallbackProtocols(symptoms: string): QRecommendation[] {
    const protocolMap: { [key: string]: QRecommendation } = {
      'chest pain': {
        confidence: 0.9,
        source: 'Emergency Medicine Guidelines',
        title: 'Acute Chest Pain Protocol',
        content: 'Immediate 12-lead ECG, cardiac enzymes, chest X-ray. Consider ACS protocol if indicated.',
        protocol: {
          id: 'chest-pain-001',
          category: 'cardiac',
          severity: 'critical',
          title: 'Acute Chest Pain Assessment',
          steps: [
            'Obtain vital signs and pulse oximetry',
            'Perform 12-lead ECG within 10 minutes',
            'Establish IV access',
            'Administer oxygen if SpO2 < 94%',
            'Consider aspirin if no contraindications'
          ],
          timeframe: '10 minutes',
          contraindications: ['Active bleeding', 'Aspirin allergy'],
          resources: ['ECG machine', 'IV supplies', 'Oxygen', 'Aspirin']
        },
        relatedActions: ['ecg', 'cardiac_enzymes', 'chest_xray']
      },
      'difficulty breathing': {
        confidence: 0.9,
        source: 'Respiratory Emergency Guidelines',
        title: 'Acute Dyspnea Protocol',
        content: 'Assess airway, breathing, circulation. Consider pneumothorax, asthma, COPD exacerbation.',
        protocol: {
          id: 'dyspnea-001',
          category: 'respiratory',
          severity: 'urgent',
          title: 'Acute Dyspnea Assessment',
          steps: [
            'Assess airway patency',
            'Obtain vital signs including SpO2',
            'Listen to lung sounds',
            'Position patient upright',
            'Administer oxygen as needed'
          ],
          timeframe: '5 minutes',
          contraindications: ['COPD with CO2 retention (use controlled oxygen)'],
          resources: ['Pulse oximeter', 'Stethoscope', 'Oxygen', 'Nebulizer']
        },
        relatedActions: ['lung_sounds', 'chest_xray', 'abg']
      }
    };

    const lowerSymptoms = symptoms.toLowerCase();
    for (const [key, protocol] of Object.entries(protocolMap)) {
      if (lowerSymptoms.includes(key)) {
        return [protocol];
      }
    }

    return [{
      confidence: 0.7,
      source: 'General Emergency Guidelines',
      title: 'General Assessment Protocol',
      content: 'Perform primary survey: Airway, Breathing, Circulation, Disability, Exposure',
      relatedActions: ['primary_survey', 'vital_signs', 'history']
    }];
  }

  // Fallback triage when Q is unavailable
  private getFallbackTriage(
    chiefComplaint: string,
    vitalSigns?: any,
    painScale?: number
  ): TriageSuggestion {
    // Simple triage logic based on keywords and vital signs
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
        immediateActions: [
          'Assess airway, breathing, circulation',
          'Obtain full vital signs',
          'Call physician immediately',
          'Prepare for emergency interventions'
        ],
        referralRecommendations: ['Emergency physician', 'Specialist consultation as needed'],
        followupRequired: true
      };
    }

    // P2 - Urgent (potentially serious)
    if ((painScale && painScale >= 7) ||
        complaint.includes('severe pain') ||
        complaint.includes('fever') ||
        (vitalSigns?.temperature && vitalSigns.temperature > 38.5)) {
      return {
        priority: 'P2',
        reasoning: 'Urgent condition requiring prompt medical attention',
        immediateActions: [
          'Complete nursing assessment',
          'Pain management as appropriate',
          'Monitor vital signs',
          'Notify physician within 30 minutes'
        ],
        referralRecommendations: ['Primary care physician', 'Appropriate specialist'],
        followupRequired: true
      };
    }

    // P3 - Less urgent
    if ((painScale && painScale >= 4) ||
        complaint.includes('minor injury') ||
        complaint.includes('cold symptoms')) {
      return {
        priority: 'P3',
        reasoning: 'Less urgent condition, can wait for scheduled care',
        immediateActions: [
          'Basic nursing assessment',
          'Comfort measures',
          'Patient education',
          'Schedule appropriate follow-up'
        ],
        referralRecommendations: ['Primary care follow-up', 'Self-care instructions'],
        followupRequired: false
      };
    }

    // P4 - Non-urgent
    return {
      priority: 'P4',
      reasoning: 'Non-urgent condition suitable for routine care',
      immediateActions: [
        'Basic assessment',
        'Provide patient education',
        'Schedule routine follow-up'
      ],
      referralRecommendations: ['Routine primary care', 'Health education resources'],
      followupRequired: false
    };
  }
}

// Export singleton instance
export const amazonQService = new AmazonQService();
