import React, { useState } from 'react';
import { Activity, AlertTriangle, Pill, Users, Stethoscope, Info } from 'lucide-react';

interface MedicalContextIndicatorProps {
  context: 'emergency' | 'consultation' | 'medication' | 'general';
  className?: string;
}

const MedicalContextIndicator: React.FC<MedicalContextIndicatorProps> = ({
  context,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const contextInfo = {
    emergency: {
      icon: AlertTriangle,
      label: 'Emergency',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Critical care translation - Maximum accuracy for life-threatening situations',
      features: ['Prioritized processing', 'Emergency terminology', 'Cultural sensitivity for urgent care']
    },
    consultation: {
      icon: Stethoscope,
      label: 'Consultation',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Clinical translation - Precise medical terminology for patient consultations',
      features: ['Professional medical tone', 'Accurate symptom descriptions', 'Diagnosis-focused language']
    },
    medication: {
      icon: Pill,
      label: 'Medication',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Pharmaceutical translation - Extreme precision for medication instructions',
      features: ['Dosage accuracy', 'Timing precision', 'Drug interaction awareness']
    },
    general: {
      icon: Users,
      label: 'General',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      description: 'Standard medical translation - Professional healthcare communication',
      features: ['Medical accuracy', 'Clear communication', 'Professional tone']
    }
  };

  const info = contextInfo[context];
  const Icon = info.icon;

  // Don't show indicator for general context unless user hovers
  if (context === 'general') {
    return null;
  }

  return (
    <div 
      className={`medical-context-indicator ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`context-badge ${info.bgColor} ${info.borderColor} ${info.color}`}>
        <Icon className="w-3 h-3" />
        <span className="text-xs font-medium">{info.label} Mode</span>
        <Info className="w-3 h-3 opacity-60" />
      </div>

      {showTooltip && (
        <div className="context-tooltip">
          <div className="tooltip-header">
            <Icon className={`w-4 h-4 ${info.color}`} />
            <span className="font-semibold">{info.label} Translation Mode</span>
          </div>
          
          <p className="tooltip-description">{info.description}</p>
          
          <div className="tooltip-features">
            <span className="features-label">Features:</span>
            <ul className="features-list">
              {info.features.map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <style>{`
        .medical-context-indicator {
          position: relative;
          display: inline-block;
        }

        .context-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border: 1px solid;
          border-radius: 6px;
          font-size: 11px;
          cursor: help;
          transition: all 0.2s ease;
        }

        .context-badge:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .context-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          width: 280px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          margin-bottom: 8px;
        }

        .context-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: white;
        }

        .tooltip-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          font-size: 13px;
        }

        .tooltip-description {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .tooltip-features {
          font-size: 11px;
        }

        .features-label {
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
          display: block;
        }

        .features-list {
          margin: 0;
          padding: 0;
          list-style: none;
          color: #64748b;
        }

        .features-list li {
          margin: 2px 0;
        }
      `}</style>
    </div>
  );
};

export default MedicalContextIndicator;
