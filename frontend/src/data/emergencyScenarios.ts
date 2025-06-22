// Comprehensive Emergency Scenarios Data
// Medical scenarios for LifeBridge translation app

import { AlertTriangle, Heart, Thermometer, Phone, Clock, Activity, Brain, Zap, Shield, User } from 'lucide-react';

export interface EmergencyScenario {
  id: string;
  category: 'cardiac' | 'respiratory' | 'neurological' | 'trauma' | 'mental-health' | 'allergic-reaction';
  severity: 'critical' | 'urgent' | 'moderate';
  icon: React.ReactNode;
  title: string;
  description: string;
  symptoms: string[];
  timeframe: string;
  phrases: string[];
  quickActions: {
    assessment: string[];
    treatment: string[];
    communication: string[];
  };
  communicationFlow: {
    step: number;
    action: string;
    phrases: string[];
    timeLimit?: string;
  }[];
  criticalIndicators: string[];
  contraindications: string[];
}

export const EMERGENCY_SCENARIOS: EmergencyScenario[] = [
  {
    id: 'heart-attack',
    category: 'cardiac',
    severity: 'critical',
    icon: <Heart className="w-6 h-6 text-red-500" />,
    title: 'Heart Attack Scenario',
    description: 'Acute myocardial infarction with severe chest pain and potential cardiac arrest',
    symptoms: [
      'Severe chest pain or pressure',
      'Pain radiating to left arm, neck, or jaw',
      'Shortness of breath',
      'Nausea and sweating',
      'Dizziness or lightheadedness'
    ],
    timeframe: 'Action needed within 2-5 minutes',
    phrases: [
      "URGENT: Patient having heart attack - call emergency services immediately",
      "Severe crushing chest pain, feels like elephant on chest",
      "Pain spreading to left arm and jaw",
      "Patient is sweating profusely and feels nauseous",
      "Pulse is weak and irregular",
      "Blood pressure is dropping rapidly",
      "Patient needs immediate cardiac intervention",
      "Prepare for possible cardiac arrest"
    ],
    quickActions: {
      assessment: [
        "Check pulse and blood pressure immediately",
        "Assess chest pain severity (1-10 scale)",
        "Look for signs of cardiac distress",
        "Check for loss of consciousness",
        "Monitor breathing and circulation"
      ],
      treatment: [
        "Call emergency services immediately",
        "Give aspirin if patient not allergic",
        "Position patient comfortably (usually sitting up)",
        "Prepare AED if available",
        "Begin CPR if patient becomes unconscious"
      ],
      communication: [
        "Heart attack in progress - need immediate ambulance",
        "Patient has severe chest pain and cardiac symptoms",
        "ETA for emergency services?",
        "Contact cardiologist on call immediately",
        "Prepare emergency cardiac medications"
      ]
    },
    communicationFlow: [
      {
        step: 1,
        action: "Initial Emergency Call",
        phrases: [
          "911 Emergency - Heart attack in progress",
          "Patient conscious but severe chest pain",
          "Need ambulance immediately"
        ],
        timeLimit: "Within 30 seconds"
      },
      {
        step: 2,
        action: "Patient Assessment",
        phrases: [
          "Sir/Madam, are you having chest pain?",
          "Can you describe the pain?",
          "Are you taking any heart medications?"
        ],
        timeLimit: "Within 2 minutes"
      },
      {
        step: 3,
        action: "Treatment Initiation",
        phrases: [
          "I'm going to give you an aspirin to chew",
          "Try to stay calm and breathe slowly",
          "Help is on the way"
        ],
        timeLimit: "Within 3 minutes"
      },
      {
        step: 4,
        action: "Continuous Monitoring",
        phrases: [
          "How is your pain now?",
          "Are you still conscious?",
          "Can you feel your heartbeat?"
        ]
      }
    ],
    criticalIndicators: [
      "Loss of consciousness",
      "No pulse detected",
      "Severe difficulty breathing",
      "Blue lips or fingernails (cyanosis)"
    ],
    contraindications: [
      "Do not give aspirin if allergic",
      "Do not leave patient alone",
      "Do not give food or water"
    ]
  },
  {
    id: 'stroke-symptoms',
    category: 'neurological',
    severity: 'critical',
    icon: <Brain className="w-6 h-6 text-purple-500" />,
    title: 'Stroke Emergency',
    description: 'Acute cerebrovascular accident with neurological deficits',
    symptoms: [
      'Sudden facial drooping',
      'Arm or leg weakness',
      'Speech difficulties',
      'Sudden severe headache',
      'Loss of balance or coordination'
    ],
    timeframe: 'Golden hour - action needed within 60 minutes',
    phrases: [
      "STROKE ALERT: Patient showing signs of stroke",
      "Face is drooping on the right/left side",
      "Cannot raise both arms equally",
      "Speech is slurred and confused",
      "Sudden onset of severe headache",
      "Patient cannot walk or maintain balance",
      "Time of symptom onset was [TIME]",
      "Need immediate CT scan and stroke team"
    ],
    quickActions: {
      assessment: [
        "Perform FAST stroke assessment (Face, Arms, Speech, Time)",
        "Check blood glucose level",
        "Note exact time of symptom onset",
        "Assess level of consciousness",
        "Check for other neurological deficits"
      ],
      treatment: [
        "Keep patient calm and still",
        "Monitor airway and breathing",
        "Nothing by mouth (NPO)",
        "Maintain normal body temperature",
        "Prepare for immediate transport"
      ],
      communication: [
        "Stroke alert activated - need emergency team",
        "Time of onset was [SPECIFIC TIME]",
        "Patient needs immediate neurological evaluation",
        "Prepare for potential thrombolytic therapy",
        "Contact stroke team immediately"
      ]
    },
    communicationFlow: [
      {
        step: 1,
        action: "FAST Assessment",
        phrases: [
          "Can you smile for me?",
          "Raise both arms above your head",
          "Repeat this phrase: 'The sky is blue in Cincinnati'"
        ],
        timeLimit: "Within 1 minute"
      },
      {
        step: 2,
        action: "Emergency Activation",
        phrases: [
          "Stroke alert - need immediate response",
          "Symptom onset at [TIME]",
          "Activating stroke protocol"
        ],
        timeLimit: "Within 2 minutes"
      },
      {
        step: 3,
        action: "Patient Stabilization",
        phrases: [
          "Stay still, don't try to move",
          "We're getting you help right away",
          "Keep your head elevated"
        ],
        timeLimit: "Within 5 minutes"
      }
    ],
    criticalIndicators: [
      "Complete loss of consciousness",
      "Severe difficulty swallowing",
      "Rapidly worsening symptoms",
      "Blood pressure extremely high (>220/120)"
    ],
    contraindications: [
      "Do not give food or water",
      "Do not give blood pressure medications without orders",
      "Do not delay transport for extended assessment"
    ]
  },
  {
    id: 'allergic-reaction',
    category: 'allergic-reaction',
    severity: 'critical',
    icon: <Shield className="w-6 h-6 text-orange-500" />,
    title: 'Severe Allergic Reaction/Anaphylaxis',
    description: 'Life-threatening allergic reaction with potential for airway compromise',
    symptoms: [
      'Difficulty breathing or wheezing',
      'Swelling of face, lips, or throat',
      'Rapid pulse and low blood pressure',
      'Widespread rash or hives',
      'Nausea, vomiting, diarrhea'
    ],
    timeframe: 'Immediate action required - minutes count',
    phrases: [
      "ANAPHYLAXIS: Severe allergic reaction in progress",
      "Patient cannot breathe properly",
      "Face and throat are swelling rapidly",
      "Covered in hives and very itchy",
      "Blood pressure dropping dangerously low",
      "Patient exposed to [ALLERGEN] at [TIME]",
      "Need epinephrine injection immediately",
      "Prepare for potential airway emergency"
    ],
    quickActions: {
      assessment: [
        "Check airway for swelling or obstruction",
        "Assess breathing and oxygen saturation",
        "Look for widespread rash or hives",
        "Check blood pressure and pulse",
        "Identify the allergen if possible"
      ],
      treatment: [
        "Administer epinephrine (EpiPen) immediately",
        "Call emergency services",
        "Give high-flow oxygen",
        "Position patient based on blood pressure",
        "Prepare for second epinephrine dose"
      ],
      communication: [
        "Anaphylaxis emergency - need immediate medical response",
        "Patient exposed to [ALLERGEN]",
        "Epinephrine administered at [TIME]",
        "May need airway management",
        "Contact allergy specialist if available"
      ]
    },
    communicationFlow: [
      {
        step: 1,
        action: "Allergen Identification",
        phrases: [
          "What did you eat/touch/take?",
          "When did this reaction start?",
          "Have you had allergic reactions before?"
        ],
        timeLimit: "Within 30 seconds"
      },
      {
        step: 2,
        action: "Emergency Treatment",
        phrases: [
          "I'm giving you epinephrine now",
          "This will help your breathing",
          "Emergency services are coming"
        ],
        timeLimit: "Within 1 minute"
      },
      {
        step: 3,
        action: "Monitoring and Support",
        phrases: [
          "How is your breathing now?",
          "Can you swallow okay?",
          "We may need a second injection"
        ],
        timeLimit: "Every 2-3 minutes"
      }
    ],
    criticalIndicators: [
      "Complete airway obstruction",
      "Severe breathing difficulty",
      "Loss of consciousness",
      "Severe hypotension (shock)"
    ],
    contraindications: [
      "Do not delay epinephrine administration",
      "Do not give oral medications if airway compromised",
      "Do not leave patient alone"
    ]
  },
  {
    id: 'accident-trauma',
    category: 'trauma',
    severity: 'critical',
    icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
    title: 'Accident Trauma Emergency',
    description: 'Major trauma from accident with potential multiple injuries',
    symptoms: [
      'Visible injuries or bleeding',
      'Loss of consciousness',
      'Severe pain in multiple areas',
      'Difficulty moving limbs',
      'Signs of internal bleeding'
    ],
    timeframe: 'Golden hour - immediate response required',
    phrases: [
      "TRAUMA ALERT: Major accident victim",
      "Patient has multiple visible injuries",
      "Heavy bleeding from [LOCATION]",
      "Patient may have internal injuries",
      "Spinal injury suspected - do not move",
      "Patient was in [TYPE] accident at [TIME]",
      "Vital signs are unstable",
      "Need trauma team immediately"
    ],
    quickActions: {
      assessment: [
        "Primary survey: Airway, Breathing, Circulation",
        "Check for spinal injuries",
        "Assess level of consciousness",
        "Look for obvious injuries and bleeding",
        "Check vital signs"
      ],
      treatment: [
        "Ensure airway is clear",
        "Control bleeding with direct pressure",
        "Immobilize spine if suspected injury",
        "Treat for shock",
        "Prepare for emergency transport"
      ],
      communication: [
        "Trauma alert - multiple injuries suspected",
        "Need trauma surgeon and OR ready",
        "Patient from [TYPE] accident",
        "Possible internal bleeding",
        "ETA to trauma center?"
      ]
    },
    communicationFlow: [
      {
        step: 1,
        action: "Scene Safety and Initial Assessment",
        phrases: [
          "Can you hear me?",
          "Don't try to move",
          "Help is coming"
        ],
        timeLimit: "Within 1 minute"
      },
      {
        step: 2,
        action: "Trauma Team Activation",
        phrases: [
          "Trauma alert - multiple injuries",
          "Need immediate medical response",
          "Preparing for emergency transport"
        ],
        timeLimit: "Within 2 minutes"
      },
      {
        step: 3,
        action: "Stabilization and Transport",
        phrases: [
          "We're going to stabilize your neck",
          "Applying pressure to stop bleeding",
          "Taking you to the hospital now"
        ],
        timeLimit: "Within 10 minutes"
      }
    ],
    criticalIndicators: [
      "Airway obstruction",
      "Severe bleeding that won't stop",
      "Signs of shock",
      "Spinal cord injury symptoms"
    ],
    contraindications: [
      "Do not move patient if spinal injury suspected",
      "Do not remove embedded objects",
      "Do not give food or water"
    ]
  },
  {
    id: 'mental-health-crisis',
    category: 'mental-health',
    severity: 'urgent',
    icon: <User className="w-6 h-6 text-blue-500" />,
    title: 'Mental Health Crisis',
    description: 'Acute psychological emergency with risk of self-harm or violence',
    symptoms: [
      'Thoughts of self-harm or suicide',
      'Severe agitation or aggression',
      'Disconnection from reality',
      'Extreme mood changes',
      'Inability to function or care for self'
    ],
    timeframe: 'Immediate assessment and intervention needed',
    phrases: [
      "Mental health emergency - patient in crisis",
      "Patient expressing thoughts of self-harm",
      "Severe agitation and confusion",
      "Patient not responding to normal conversation",
      "Safety concerns for patient and others",
      "Need mental health professional immediately",
      "Patient requires psychiatric evaluation",
      "De-escalation techniques needed"
    ],
    quickActions: {
      assessment: [
        "Assess immediate safety risk",
        "Evaluate suicidal or homicidal ideation",
        "Check for substance use",
        "Assess level of reality contact",
        "Determine if patient is cooperative"
      ],
      treatment: [
        "Ensure safety of patient and staff",
        "Use calm, non-threatening approach",
        "Remove potential harmful objects",
        "Consider medication if prescribed",
        "Prepare for psychiatric hold if necessary"
      ],
      communication: [
        "Mental health crisis - need psychiatric evaluation",
        "Patient expressing suicidal thoughts",
        "Safety measures in place",
        "Contact psychiatrist on call",
        "May need involuntary commitment"
      ]
    },
    communicationFlow: [
      {
        step: 1,
        action: "Safety Assessment",
        phrases: [
          "I'm here to help you",
          "You're safe now",
          "Can you tell me how you're feeling?"
        ],
        timeLimit: "Within 2 minutes"
      },
      {
        step: 2,
        action: "De-escalation",
        phrases: [
          "I can see you're upset",
          "Let's talk about what's happening",
          "We want to help you feel better"
        ],
        timeLimit: "Ongoing"
      },
      {
        step: 3,
        action: "Professional Support",
        phrases: [
          "I'm calling a specialist to help",
          "They know how to help with these feelings",
          "You don't have to go through this alone"
        ],
        timeLimit: "Within 10 minutes"
      }
    ],
    criticalIndicators: [
      "Active suicidal behavior",
      "Violent or aggressive actions",
      "Complete loss of reality contact",
      "Medical complications from self-harm"
    ],
    contraindications: [
      "Do not leave patient alone if suicidal",
      "Do not argue with delusions",
      "Do not make promises you cannot keep"
    ]
  },
  {
    id: 'respiratory-emergency',
    category: 'respiratory',
    severity: 'critical',
    icon: <Activity className="w-6 h-6 text-blue-500" />,
    title: 'Severe Respiratory Distress',
    description: 'Life-threatening breathing emergency requiring immediate intervention',
    symptoms: [
      'Severe difficulty breathing',
      'Cannot speak in full sentences',
      'Blue lips or fingernails',
      'Using accessory muscles to breathe',
      'Extremely high or low respiratory rate'
    ],
    timeframe: 'Immediate action required - seconds to minutes',
    phrases: [
      "RESPIRATORY EMERGENCY: Patient cannot breathe",
      "Oxygen saturation critically low",
      "Patient turning blue around lips",
      "Using neck muscles to breathe",
      "Cannot speak due to breathing difficulty",
      "Wheezing and severe shortness of breath",
      "Need oxygen and airway support immediately",
      "Possible respiratory failure"
    ],
    quickActions: {
      assessment: [
        "Check oxygen saturation immediately",
        "Count respiratory rate",
        "Listen to lung sounds",
        "Assess for cyanosis (blue coloring)",
        "Check for use of accessory muscles"
      ],
      treatment: [
        "Administer high-flow oxygen immediately",
        "Position patient upright (tripod position)",
        "Prepare bronchodilator if asthma",
        "Consider epinephrine if anaphylaxis",
        "Prepare for intubation if needed"
      ],
      communication: [
        "Respiratory failure - need immediate support",
        "Patient needs airway management",
        "Oxygen saturation is [NUMBER]%",
        "Prepare respiratory therapy team",
        "May need mechanical ventilation"
      ]
    },
    communicationFlow: [
      {
        step: 1,
        action: "Immediate Oxygen Support",
        phrases: [
          "I'm putting oxygen on you now",
          "This will help you breathe",
          "Try to stay calm"
        ],
        timeLimit: "Within 30 seconds"
      },
      {
        step: 2,
        action: "Emergency Team Activation",
        phrases: [
          "Respiratory emergency - need immediate response",
          "Patient in severe breathing distress",
          "May need intubation"
        ],
        timeLimit: "Within 1 minute"
      },
      {
        step: 3,
        action: "Advanced Support",
        phrases: [
          "We're going to help your breathing",
          "The medicine will open your airways",
          "Breathing should get easier soon"
        ],
        timeLimit: "Within 5 minutes"
      }
    ],
    criticalIndicators: [
      "Respiratory arrest",
      "Oxygen saturation below 80%",
      "Complete inability to speak",
      "Loss of consciousness from hypoxia"
    ],
    contraindications: [
      "Do not delay oxygen administration",
      "Do not give sedatives without airway protection",
      "Do not leave patient alone"
    ]
  }
];

// Quick action templates for each scenario type
export const QUICK_ACTION_TEMPLATES = {
  cardiac: {
    immediate: ["Check pulse", "Call 911", "Give aspirin", "Prepare AED"],
    monitoring: ["Watch breathing", "Check consciousness", "Monitor vital signs"],
    communication: ["Notify cardiologist", "Update EMS", "Contact family"]
  },
  respiratory: {
    immediate: ["Give oxygen", "Position upright", "Check saturation", "Call respiratory team"],
    monitoring: ["Count breaths", "Watch color", "Listen to lungs"],
    communication: ["Notify pulmonologist", "Update status", "Prepare transport"]
  },
  neurological: {
    immediate: ["FAST assessment", "Note time", "Keep still", "Call stroke team"],
    monitoring: ["Check consciousness", "Monitor vitals", "Watch for changes"],
    communication: ["Stroke alert", "Time of onset", "CT scan ready"]
  },
  trauma: {
    immediate: ["Check ABC", "Control bleeding", "Immobilize spine", "Call trauma team"],
    monitoring: ["Watch vitals", "Check consciousness", "Monitor bleeding"],
    communication: ["Trauma alert", "Mechanism of injury", "OR ready"]
  },
  "mental-health": {
    immediate: ["Ensure safety", "Remove hazards", "Use calm voice", "Call psychiatrist"],
    monitoring: ["Watch behavior", "Check reality contact", "Monitor safety"],
    communication: ["Psychiatric consult", "Safety measures", "Family notification"]
  },
  "allergic-reaction": {
    immediate: ["Give epinephrine", "Call 911", "Check airway", "Give oxygen"],
    monitoring: ["Watch breathing", "Check BP", "Monitor swelling"],
    communication: ["Anaphylaxis alert", "Allergen exposure", "Second dose ready"]
  }
};
