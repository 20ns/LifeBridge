import React, { useState, useEffect } from 'react';
import { AlertTriangle, Brain, Clock, Users, Shield, CheckCircle } from 'lucide-react';
import { getEmergencyProtocol, getTriageSuggestion, getContextualAdvice } from '../services/awsService';
import type { EmergencyProtocol, TriageSuggestion, ContextualAdvice } from '../services/awsService';

interface QRecommendationsProps {
  medicalText: string;
  sourceLanguage: string;
  targetLanguage: string;
  context: 'emergency' | 'consultation' | 'medication' | 'general';
  symptoms?: string;
  patientAge?: number;
  vitalSigns?: {
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  };
  painScale?: number;
}

const QRecommendations: React.FC<QRecommendationsProps> = ({
  medicalText,
  sourceLanguage,
  targetLanguage,
  context,
  symptoms,
  patientAge,
  vitalSigns,
  painScale
}) => {
  const [emergencyProtocol, setEmergencyProtocol] = useState<EmergencyProtocol | null>(null);
  const [triageSuggestion, setTriageSuggestion] = useState<TriageSuggestion | null>(null);
  const [contextualAdvice, setContextualAdvice] = useState<ContextualAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (medicalText && medicalText.length > 10) {
      fetchRecommendations();
    }
  }, [medicalText, context, symptoms]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch contextual advice for all scenarios
      const advicePromise = getContextualAdvice(medicalText, sourceLanguage, targetLanguage, context);

      // Fetch emergency protocol if symptoms present
      const protocolPromise = symptoms ? 
        getEmergencyProtocol(symptoms, patientAge) : 
        Promise.resolve(null);

      // Fetch triage suggestion if this is an emergency context
      const triagePromise = (context === 'emergency' && symptoms) ?
        getTriageSuggestion(symptoms, vitalSigns, painScale) :
        Promise.resolve(null);

      const [adviceResult, protocolResult, triageResult] = await Promise.all([
        advicePromise,
        protocolPromise,
        triagePromise
      ]);

      setContextualAdvice(adviceResult.advice);
      
      if (protocolResult) {
        setEmergencyProtocol(protocolResult.recommendations);
      }
      
      if (triageResult) {
        setTriageSuggestion(triageResult.triage);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P1': return 'bg-red-100 text-red-800 border-red-200';
      case 'P2': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'P3': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'P4': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center gap-2">
          <Brain className="animate-pulse text-blue-600" size={20} />
          <span className="text-blue-800 font-medium">Getting AI recommendations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-red-600" size={20} />
          <span className="text-red-800">Recommendations unavailable: {error}</span>
        </div>
      </div>
    );
  }

  if (!contextualAdvice && !emergencyProtocol && !triageSuggestion) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Triage Suggestion - Highest Priority */}
      {triageSuggestion && (
        <div className="bg-white rounded-lg border-2 border-red-200 shadow-sm">
          <div className="bg-red-50 px-4 py-3 border-b border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-600" size={20} />
                <h3 className="font-bold text-red-800">🚨 Triage Assessment</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getPriorityColor(triageSuggestion.priority)}`}>
                {triageSuggestion.priority}
              </span>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            <div>
              <h4 className="font-medium text-gray-800 mb-1">Assessment:</h4>
              <p className="text-gray-700">{triageSuggestion.reasoning}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-1">⏱️ Timeframe:</h4>
              <p className="text-gray-700">{triageSuggestion.timeframe}</p>
            </div>
            
            {triageSuggestion.immediateActions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-800 mb-2">🎯 Immediate Actions:</h4>
                <ul className="space-y-1">
                  {triageSuggestion.immediateActions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {triageSuggestion.referrals.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-800 mb-2">🏥 Referrals:</h4>
                <div className="flex flex-wrap gap-2">
                  {triageSuggestion.referrals.map((referral, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {referral}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency Protocol */}
      {emergencyProtocol && (
        <div className="bg-white rounded-lg border border-orange-200 shadow-sm">
          <div className="bg-orange-50 px-4 py-3 border-b border-orange-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="text-orange-600" size={20} />
                <h3 className="font-bold text-orange-800">📋 Emergency Protocol</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getSeverityColor(emergencyProtocol.severity)}`}>
                {emergencyProtocol.severity}
              </span>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            <div>
              <h4 className="font-bold text-gray-800">{emergencyProtocol.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Clock size={14} className="text-gray-600" />
                <span className="text-gray-600 text-sm">Complete within: {emergencyProtocol.timeframe}</span>
              </div>
            </div>
            
            {emergencyProtocol.immediateActions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-800 mb-2">🎯 Immediate Actions:</h4>
                <ol className="space-y-1">
                  {emergencyProtocol.immediateActions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 text-sm">{action}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            
            {emergencyProtocol.equipment.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-800 mb-2">🛠️ Required Equipment:</h4>
                <div className="flex flex-wrap gap-2">
                  {emergencyProtocol.equipment.map((item, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {emergencyProtocol.contraindications.length > 0 && (
              <div>
                <h4 className="font-medium text-red-700 mb-2">⚠️ Contraindications:</h4>
                <ul className="space-y-1">
                  {emergencyProtocol.contraindications.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-red-700 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contextual Translation Advice */}
      {contextualAdvice && (
        <div className="bg-white rounded-lg border border-blue-200 shadow-sm">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
            <div className="flex items-center gap-2">
              <Users className="text-blue-600" size={20} />
              <h3 className="font-bold text-blue-800">🌍 Translation Guidance</h3>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            {contextualAdvice.culturalConsiderations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-800 mb-2">🤝 Cultural Considerations:</h4>
                <ul className="space-y-1">
                  {contextualAdvice.culturalConsiderations.map((item, index) => (
                    <li key={index} className="text-gray-700 text-sm flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {contextualAdvice.criticalTerminology.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-800 mb-2">🎯 Critical Terminology:</h4>
                <ul className="space-y-1">
                  {contextualAdvice.criticalTerminology.map((item, index) => (
                    <li key={index} className="text-gray-700 text-sm flex items-start gap-2">
                      <span className="text-orange-600 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {contextualAdvice.verificationSteps.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-800 mb-2">✅ Verification Steps:</h4>
                <ul className="space-y-1">
                  {contextualAdvice.verificationSteps.map((item, index) => (
                    <li key={index} className="text-gray-700 text-sm flex items-start gap-2">
                      <CheckCircle size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {contextualAdvice.safetyConsiderations.length > 0 && (
              <div>
                <h4 className="font-medium text-red-700 mb-2">🛡️ Safety Considerations:</h4>
                <ul className="space-y-1">
                  {contextualAdvice.safetyConsiderations.map((item, index) => (
                    <li key={index} className="text-red-700 text-sm flex items-start gap-2">
                      <Shield size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRecommendations;
