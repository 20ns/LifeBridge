// Medical terminology dictionary and validation utilities
export interface MedicalTerm {
  term: string;
  category: 'anatomy' | 'symptom' | 'medication' | 'procedure' | 'condition' | 'emergency';
  alternatives: string[];
  criticality: 'low' | 'medium' | 'high' | 'critical';
  culturalConsiderations?: string[];
}

export const medicalTermsDictionary: MedicalTerm[] = [
  // Emergency terms
  {
    term: 'chest pain',
    category: 'emergency',
    alternatives: ['heart pain', 'cardiac pain', 'chest discomfort'],
    criticality: 'critical',
    culturalConsiderations: ['May be described differently across cultures', 'Some cultures may minimize pain expression']
  },
  {
    term: 'difficulty breathing',
    category: 'emergency',
    alternatives: ['shortness of breath', 'can\'t breathe', 'breathing problems'],
    criticality: 'critical'
  },
  {
    term: 'severe bleeding',
    category: 'emergency',
    alternatives: ['heavy bleeding', 'excessive bleeding', 'hemorrhage'],
    criticality: 'critical'
  },
  
  // Symptoms
  {
    term: 'headache',
    category: 'symptom',
    alternatives: ['head pain', 'cephalgia'],
    criticality: 'medium'
  },
  {
    term: 'nausea',
    category: 'symptom',
    alternatives: ['feeling sick', 'queasy', 'upset stomach'],
    criticality: 'medium'
  },
  {
    term: 'fever',
    category: 'symptom',
    alternatives: ['high temperature', 'pyrexia'],
    criticality: 'medium'
  },
  
  // Medications - Critical for accuracy
  {
    term: 'insulin',
    category: 'medication',
    alternatives: ['diabetes medication'],
    criticality: 'critical',
    culturalConsiderations: ['Dosage timing critical across time zones']
  },
  {
    term: 'epinephrine',
    category: 'medication',
    alternatives: ['adrenaline', 'epipen'],
    criticality: 'critical'
  },
  {
    term: 'nitroglycerin',
    category: 'medication',
    alternatives: ['nitro', 'heart medication'],
    criticality: 'critical'
  },
  
  // Anatomy
  {
    term: 'abdomen',
    category: 'anatomy',
    alternatives: ['stomach area', 'belly', 'tummy'],
    criticality: 'medium'
  },
  {
    term: 'thorax',
    category: 'anatomy',
    alternatives: ['chest', 'upper body'],
    criticality: 'medium'
  }
];

// Emergency keywords that trigger immediate priority processing
export const emergencyKeywords = [
  'emergency', 'urgent', 'help', 'pain', 'bleeding', 'breathe', 'breathing',
  'chest', 'heart', 'unconscious', 'seizure', 'stroke', 'allergic reaction',
  'overdose', 'poisoning', 'burn', 'fracture', 'trauma'
];

// Medication-related keywords that require high accuracy
export const medicationKeywords = [
  'dosage', 'dose', 'prescription', 'medication', 'medicine', 'pills',
  'injection', 'insulin', 'allergy', 'allergic', 'side effect', 'reaction'
];

// Validate if text contains medical terminology
export const containsMedicalTerms = (text: string): boolean => {
  const lowercaseText = text.toLowerCase();
  return medicalTermsDictionary.some(term => 
    lowercaseText.includes(term.term.toLowerCase()) ||
    term.alternatives.some(alt => lowercaseText.includes(alt.toLowerCase()))
  );
};

// Check if text contains emergency keywords
export const containsEmergencyKeywords = (text: string): boolean => {
  const lowercaseText = text.toLowerCase();
  return emergencyKeywords.some(keyword => lowercaseText.includes(keyword));
};

// Check if text contains medication keywords
export const containsMedicationKeywords = (text: string): boolean => {
  const lowercaseText = text.toLowerCase();
  return medicationKeywords.some(keyword => lowercaseText.includes(keyword));
};

// Get medical term suggestions for autocomplete
export const getMedicalTermSuggestions = (partialText: string): MedicalTerm[] => {
  const lowercasePartial = partialText.toLowerCase();
  return medicalTermsDictionary.filter(term =>
    term.term.toLowerCase().includes(lowercasePartial) ||
    term.alternatives.some(alt => alt.toLowerCase().includes(lowercasePartial))
  ).slice(0, 5); // Return top 5 suggestions
};

// Analyze text for medical context and criticality
export interface MedicalAnalysis {
  containsMedical: boolean;
  isEmergency: boolean;
  requiresMedicationAccuracy: boolean;
  detectedTerms: MedicalTerm[];
  recommendedContext: 'emergency' | 'consultation' | 'medication' | 'general';
  criticalityScore: number; // 0-100
}

export const analyzeMedicalContent = (text: string): MedicalAnalysis => {
  const lowercaseText = text.toLowerCase();
  
  // Find matching medical terms
  const detectedTerms = medicalTermsDictionary.filter(term =>
    lowercaseText.includes(term.term.toLowerCase()) ||
    term.alternatives.some(alt => lowercaseText.includes(alt.toLowerCase()))
  );
  
  const containsMedical = detectedTerms.length > 0;
  const isEmergency = containsEmergencyKeywords(text);
  const requiresMedicationAccuracy = containsMedicationKeywords(text);
  
  // Calculate criticality score
  let criticalityScore = 0;
  detectedTerms.forEach(term => {
    switch (term.criticality) {
      case 'critical': criticalityScore += 25; break;
      case 'high': criticalityScore += 15; break;
      case 'medium': criticalityScore += 10; break;
      case 'low': criticalityScore += 5; break;
    }
  });
  
  // Determine recommended context
  let recommendedContext: 'emergency' | 'consultation' | 'medication' | 'general';
  if (isEmergency || criticalityScore > 50) {
    recommendedContext = 'emergency';
  } else if (requiresMedicationAccuracy) {
    recommendedContext = 'medication';
  } else if (containsMedical) {
    recommendedContext = 'consultation';
  } else {
    recommendedContext = 'general';
  }
  
  return {
    containsMedical,
    isEmergency,
    requiresMedicationAccuracy,
    detectedTerms,
    recommendedContext,
    criticalityScore: Math.min(100, criticalityScore)
  };
};
