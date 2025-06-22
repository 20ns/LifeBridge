import React from 'react';

export type MedicalContextType = 'emergency' | 'consultation' | 'medication' | 'general';

interface MedicalContextIndicatorProps {
  context: MedicalContextType;
  className?: string;
}

const MedicalContextIndicator: React.FC<MedicalContextIndicatorProps> = ({
  context,
  className = ''
}) => {
  return (
    <div className={`medical-context-indicator ${className}`}>
      {context}
    </div>  );
};

export default MedicalContextIndicator;
