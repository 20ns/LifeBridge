// Medical terminology analysis service for backend criticality scoring
export interface MedicalTerm {
  term: string;
  category: 'anatomy' | 'symptom' | 'medication' | 'procedure' | 'condition' | 'emergency';
  alternatives: string[];
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

export const medicalTermsDictionary: MedicalTerm[] = [
  // Emergency terms
  {
    term: 'chest pain',
    category: 'emergency',
    alternatives: ['heart pain', 'cardiac pain', 'chest discomfort', 'heart attack'],
    criticality: 'critical'
  },
  {
    term: 'difficulty breathing',
    category: 'emergency',
    alternatives: ['shortness of breath', 'can\'t breathe', 'breathing problems', 'breathe'],
    criticality: 'critical'
  },
  {
    term: 'severe bleeding',
    category: 'emergency',
    alternatives: ['heavy bleeding', 'excessive bleeding', 'hemorrhage', 'bleeding'],
    criticality: 'critical'
  },
  {
    term: 'unconscious',
    category: 'emergency',
    alternatives: ['passed out', 'unresponsive', 'not conscious'],
    criticality: 'critical'
  },
  {
    term: 'seizure',
    category: 'emergency',
    alternatives: ['convulsion', 'fit', 'epileptic'],
    criticality: 'critical'
  },
  {
    term: 'stroke',
    category: 'emergency',
    alternatives: ['brain attack', 'cerebrovascular'],
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
  {
    term: 'pain',
    category: 'symptom',
    alternatives: ['hurt', 'ache', 'discomfort'],
    criticality: 'medium'
  },
  
  // Critical medications
  {
    term: 'insulin',
    category: 'medication',
    alternatives: ['diabetes medication'],
    criticality: 'critical'
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
  }
];

// Emergency keywords that trigger immediate priority processing
export const emergencyKeywords = [
  'emergency', 'urgent', 'help', 'sudden', 'severe', 'acute', 'bleeding', 'breathe', 'breathing',
  'chest', 'heart attack', 'unconscious', 'seizure', 'stroke', 'allergic reaction',
  'overdose', 'poisoning', 'burn', 'fracture', 'trauma', 'critical', 'immediate'
];

// Medical modifiers that reduce criticality (chronic/ongoing conditions)
export const chronicModifiers = [
  'chronic', 'ongoing', 'regular', 'usual', 'daily', 'long-term', 'persistent',
  'recurring', 'routine', 'managed', 'controlled', 'stable'
];

// Medical modifiers that increase criticality (acute conditions)
export const acuteModifiers = [
  'sudden', 'severe', 'acute', 'intense', 'sharp', 'crushing', 'stabbing',
  'new', 'worsening', 'getting worse', 'unbearable', 'emergency', 'immediately'
];

// Medical analysis interface
export interface MedicalAnalysis {
  containsMedical: boolean;
  isEmergency: boolean;
  detectedTerms: MedicalTerm[];
  recommendedContext: 'emergency' | 'consultation' | 'medication' | 'general';
  criticalityScore: number; // 0-100
  modifierContext: 'acute' | 'chronic' | 'neutral';
}

// Analyze text for medical content and criticality
export const analyzeMedicalContent = (text: string): MedicalAnalysis => {
  const lowercaseText = text.toLowerCase();
  
  // Find matching medical terms
  const detectedTerms = medicalTermsDictionary.filter(term =>
    lowercaseText.includes(term.term.toLowerCase()) ||
    term.alternatives.some(alt => lowercaseText.includes(alt.toLowerCase()))
  );
  
  // Detect medical modifiers
  const hasChronicModifiers = chronicModifiers.some(modifier => 
    lowercaseText.includes(modifier.toLowerCase())
  );
  const hasAcuteModifiers = acuteModifiers.some(modifier => 
    lowercaseText.includes(modifier.toLowerCase())
  );
  
  // Determine modifier context
  let modifierContext: 'acute' | 'chronic' | 'neutral';
  if (hasAcuteModifiers) {
    modifierContext = 'acute';
  } else if (hasChronicModifiers) {
    modifierContext = 'chronic';
  } else {
    modifierContext = 'neutral';
  }
  
  const containsMedical = detectedTerms.length > 0;
  const isEmergency = emergencyKeywords.some(keyword => 
    lowercaseText.includes(keyword.toLowerCase())
  ) && modifierContext !== 'chronic';
  
  // Calculate criticality score with modifier adjustments
  let criticalityScore = 0;
  detectedTerms.forEach(term => {
    let baseScore = 0;
    switch (term.criticality) {
      case 'critical': baseScore = 25; break;
      case 'high': baseScore = 15; break;
      case 'medium': baseScore = 10; break;
      case 'low': baseScore = 5; break;
    }
    
    // Apply modifier adjustments
    if (modifierContext === 'chronic') {
      // Reduce criticality for chronic conditions
      baseScore = Math.floor(baseScore * 0.4); // 60% reduction
    } else if (modifierContext === 'acute') {
      // Increase criticality for acute conditions
      baseScore = Math.floor(baseScore * 1.2); // 20% increase
    }
    
    criticalityScore += baseScore;
  });
  
  // Add emergency keyword bonus
  if (isEmergency) {
    criticalityScore += 20; // Emergency keyword bonus
  }
  
  // Determine recommended context
  let recommendedContext: 'emergency' | 'consultation' | 'medication' | 'general';
  if (isEmergency && modifierContext !== 'chronic') {
    recommendedContext = 'emergency';
  } else if (detectedTerms.some(term => term.category === 'medication')) {
    recommendedContext = 'medication';
  } else if (containsMedical) {
    recommendedContext = 'consultation';
  } else {
    recommendedContext = 'general';
  }
  
  return {
    containsMedical,
    isEmergency,
    detectedTerms,
    recommendedContext,
    criticalityScore: Math.min(100, criticalityScore),
    modifierContext
  };
};
