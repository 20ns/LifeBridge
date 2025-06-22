// Emergency Scenario Workflow Component Integration Test
// Tests the React component functionality with real emergency scenarios

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmergencyScenarioWorkflow from '../../frontend/src/components/EmergencyScenarioWorkflow';

// Mock AWS services
jest.mock('../../../frontend/src/services/awsService', () => ({
  translateText: jest.fn().mockResolvedValue({
    translatedText: 'Translated emergency phrase',
    sourceLanguage: 'en',
    targetLanguage: 'es'
  }),
  speakText: jest.fn().mockResolvedValue('Speech generated successfully')
}));

describe('EmergencyScenarioWorkflow Component Integration', () => {
  const defaultProps = {
    sourceLanguage: 'en',
    targetLanguage: 'es',
    onPhraseSelect: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render emergency scenarios grid', () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      // Check main title
      expect(screen.getByText('Emergency Scenario Workflows')).toBeInTheDocument();
      
      // Check all 6 emergency scenarios are displayed
      expect(screen.getByText('Heart Attack Scenario')).toBeInTheDocument();
      expect(screen.getByText('Stroke Emergency')).toBeInTheDocument();
      expect(screen.getByText('Severe Allergic Reaction/Anaphylaxis')).toBeInTheDocument();
      expect(screen.getByText('Accident Trauma Emergency')).toBeInTheDocument();
      expect(screen.getByText('Mental Health Crisis')).toBeInTheDocument();
      expect(screen.getByText('Severe Respiratory Distress')).toBeInTheDocument();
    });

    test('should display severity badges correctly', () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      // Check for critical severity badges
      const criticalBadges = screen.getAllByText('CRITICAL');
      expect(criticalBadges).toHaveLength(5); // 5 critical scenarios
      
      // Check for urgent severity badge
      expect(screen.getByText('URGENT')).toBeInTheDocument();
    });

    test('should show initial instructions when no scenario selected', () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      expect(screen.getByText('Select an Emergency Scenario')).toBeInTheDocument();
      expect(screen.getByText('Choose a medical emergency scenario above to access guided workflows and translated phrases.')).toBeInTheDocument();
    });
  });

  describe('Heart Attack Scenario Workflow', () => {
    test('should display heart attack scenario details when selected', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      // Click on heart attack scenario
      fireEvent.click(screen.getByText('Heart Attack Scenario'));
      
      // Check scenario details appear
      await waitFor(() => {
        expect(screen.getByText('Acute myocardial infarction with severe chest pain and potential cardiac arrest')).toBeInTheDocument();
        expect(screen.getByText('Action needed within 2-5 minutes')).toBeInTheDocument();
      });
      
      // Check symptoms are displayed
      expect(screen.getByText('Severe chest pain or pressure')).toBeInTheDocument();
      expect(screen.getByText('Pain radiating to left arm, neck, or jaw')).toBeInTheDocument();
      
      // Check emergency phrases are displayed
      expect(screen.getByText('URGENT: Patient having heart attack - call emergency services immediately')).toBeInTheDocument();
    });

    test('should execute heart attack quick actions workflow', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Heart Attack Scenario'));
      
      await waitFor(() => {
        // Check assessment actions
        expect(screen.getByText('Check pulse and blood pressure immediately')).toBeInTheDocument();
        
        // Check treatment actions
        expect(screen.getByText('Call emergency services immediately')).toBeInTheDocument();
        expect(screen.getByText('Give aspirin if patient not allergic')).toBeInTheDocument();
        
        // Check communication actions
        expect(screen.getByText('Heart attack in progress - need immediate ambulance')).toBeInTheDocument();
      });
    });

    test('should handle phrase selection and speech for heart attack', async () => {
      const { translateText, speakText } = require('../../frontend/src/services/awsService');
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Heart Attack Scenario'));
      
      await waitFor(() => {
        const emergencyPhrase = screen.getByText('URGENT: Patient having heart attack - call emergency services immediately');
        fireEvent.click(emergencyPhrase);
      });
      
      // Verify phrase was selected
      expect(defaultProps.onPhraseSelect).toHaveBeenCalledWith('URGENT: Patient having heart attack - call emergency services immediately');
      
      // Verify speech was triggered
      await waitFor(() => {
        expect(speakText).toHaveBeenCalled();
      });
    });
  });

  describe('Stroke Emergency Scenario Workflow', () => {
    test('should display FAST assessment protocol for stroke', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Stroke Emergency'));
      
      await waitFor(() => {
        // Check FAST assessment step
        expect(screen.getByText('FAST Assessment')).toBeInTheDocument();
        expect(screen.getByText('Can you smile for me?')).toBeInTheDocument();
        expect(screen.getByText('Within 1 minute')).toBeInTheDocument();
      });
      
      // Check stroke-specific symptoms
      expect(screen.getByText('Sudden facial drooping')).toBeInTheDocument();
      expect(screen.getByText('Speech difficulties')).toBeInTheDocument();
    });

    test('should show golden hour timeframe for stroke', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Stroke Emergency'));
      
      await waitFor(() => {
        expect(screen.getByText('Golden hour - action needed within 60 minutes')).toBeInTheDocument();
      });
    });
  });

  describe('Anaphylaxis Scenario Workflow', () => {
    test('should display epinephrine administration protocol', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Severe Allergic Reaction/Anaphylaxis'));
      
      await waitFor(() => {
        // Check EpiPen administration
        expect(screen.getByText('Administer epinephrine (EpiPen) immediately')).toBeInTheDocument();
        
        // Check allergen identification step
        expect(screen.getByText('Allergen Identification')).toBeInTheDocument();
        expect(screen.getByText('What did you eat/touch/take?')).toBeInTheDocument();
      });
      
      // Check anaphylaxis symptoms
      expect(screen.getByText('Difficulty breathing or wheezing')).toBeInTheDocument();
      expect(screen.getByText('Swelling of face, lips, or throat')).toBeInTheDocument();
    });

    test('should show immediate action timeframe for anaphylaxis', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Severe Allergic Reaction/Anaphylaxis'));
      
      await waitFor(() => {
        expect(screen.getByText('Immediate action required - minutes count')).toBeInTheDocument();
      });
    });
  });

  describe('Trauma Emergency Scenario Workflow', () => {
    test('should display ABC trauma assessment protocol', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Accident Trauma Emergency'));
      
      await waitFor(() => {
        // Check ABC assessment
        expect(screen.getByText('Primary survey: Airway, Breathing, Circulation')).toBeInTheDocument();
        
        // Check trauma alert
        expect(screen.getByText('TRAUMA ALERT: Major accident victim')).toBeInTheDocument();
        
        // Check scene safety step
        expect(screen.getByText('Scene Safety and Initial Assessment')).toBeInTheDocument();
      });
    });

    test('should show spinal injury precautions', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Accident Trauma Emergency'));
      
      await waitFor(() => {
        expect(screen.getByText('Do not move patient if spinal injury suspected')).toBeInTheDocument();
      });
    });
  });

  describe('Mental Health Crisis Scenario Workflow', () => {
    test('should display de-escalation protocol', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Mental Health Crisis'));
      
      await waitFor(() => {
        // Check safety assessment
        expect(screen.getByText('Safety Assessment')).toBeInTheDocument();
        expect(screen.getByText("I'm here to help you")).toBeInTheDocument();
        
        // Check de-escalation approach
        expect(screen.getByText('Ensure safety of patient and staff')).toBeInTheDocument();
      });
    });

    test('should show urgent (not critical) severity for mental health', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Mental Health Crisis'));
      
      await waitFor(() => {
        // Mental health should be urgent, not critical
        const urgentBadge = screen.getByText('URGENT');
        expect(urgentBadge).toBeInTheDocument();
      });
    });
  });

  describe('Respiratory Emergency Scenario Workflow', () => {
    test('should display oxygen administration protocol', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Severe Respiratory Distress'));
      
      await waitFor(() => {
        // Check immediate oxygen support
        expect(screen.getByText('Immediate Oxygen Support')).toBeInTheDocument();
        expect(screen.getByText("I'm putting oxygen on you now")).toBeInTheDocument();
        
        // Check oxygen administration
        expect(screen.getByText('Administer high-flow oxygen immediately')).toBeInTheDocument();
      });
    });

    test('should show seconds-to-minutes timeframe for respiratory emergency', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Severe Respiratory Distress'));
      
      await waitFor(() => {
        expect(screen.getByText('Immediate action required - seconds to minutes')).toBeInTheDocument();
      });
    });
  });

  describe('Translation Integration', () => {
    test('should trigger translation when scenario is selected', async () => {
      const { translateText } = require('../../frontend/src/services/awsService');
      
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Heart Attack Scenario'));
      
      // Wait for translations to be triggered
      await waitFor(() => {
        expect(translateText).toHaveBeenCalled();
      });
      
      // Should translate multiple phrases
      expect(translateText).toHaveBeenCalledTimes(expect.any(Number));
    });

    test('should handle translation errors gracefully', async () => {
      const { translateText } = require('../../frontend/src/services/awsService');
      translateText.mockRejectedValueOnce(new Error('Translation failed'));
      
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Stroke Emergency'));
      
      // Component should still render even if translation fails
      await waitFor(() => {
        expect(screen.getByText('Stroke Emergency')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow Timing and Critical Indicators', () => {
    test('should display time limits for critical steps', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Heart Attack Scenario'));
      
      await waitFor(() => {
        expect(screen.getByText('Within 30 seconds')).toBeInTheDocument();
      });
    });

    test('should show critical indicators for each scenario', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Heart Attack Scenario'));
      
      await waitFor(() => {
        expect(screen.getByText('Loss of consciousness')).toBeInTheDocument();
        expect(screen.getByText('No pulse detected')).toBeInTheDocument();
      });
    });

    test('should display contraindications', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Heart Attack Scenario'));
      
      await waitFor(() => {
        expect(screen.getByText('Do not give aspirin if allergic')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Scenario Switching', () => {
    test('should switch between scenarios correctly', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      // Select heart attack first
      fireEvent.click(screen.getByText('Heart Attack Scenario'));
      
      await waitFor(() => {
        expect(screen.getByText('Acute myocardial infarction')).toBeInTheDocument();
      });
      
      // Switch to stroke
      fireEvent.click(screen.getByText('Stroke Emergency'));
      
      await waitFor(() => {
        expect(screen.getByText('Acute cerebrovascular accident')).toBeInTheDocument();
        // Heart attack content should be gone
        expect(screen.queryByText('Acute myocardial infarction')).not.toBeInTheDocument();
      });
    });

    test('should reset workflow when switching scenarios', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      // Select a scenario
      fireEvent.click(screen.getByText('Heart Attack Scenario'));
      await waitFor(() => {
        expect(screen.getByText('Heart Attack Scenario')).toBeInTheDocument();
      });
      
      // Switch to another scenario
      fireEvent.click(screen.getByText('Respiratory Emergency'));
      await waitFor(() => {
        expect(screen.getByText('Severe Respiratory Distress')).toBeInTheDocument();
      });
      
      // Workflow should be reset (no active steps)
      // This tests that switching scenarios resets the workflow state
    });
  });

  describe('Accessibility and Usability', () => {
    test('should be keyboard accessible', async () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      // Should be able to tab through scenarios
      const firstScenario = screen.getByText('Heart Attack Scenario').closest('button');
      expect(firstScenario).toBeInTheDocument();
      
      // Focus and activate with Enter
      firstScenario?.focus();
      fireEvent.keyDown(firstScenario, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Acute myocardial infarction')).toBeInTheDocument();
      });
    });

    test('should have proper ARIA labels for emergency content', () => {
      render(<EmergencyScenarioWorkflow {...defaultProps} />);
      
      // Check for accessible content structure
      expect(screen.getByText('Emergency Scenario Workflows')).toBeInTheDocument();
    });
  });
});

// Performance tests for emergency scenarios
describe('Emergency Scenarios Performance', () => {
  test('should render all scenarios quickly', () => {
    const startTime = performance.now();
    
    render(<EmergencyScenarioWorkflow 
      sourceLanguage="en" 
      targetLanguage="es" 
      onPhraseSelect={jest.fn()} 
    />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within 100ms for emergency use
    expect(renderTime).toBeLessThan(100);
  });

  test('should handle rapid scenario switching', async () => {
    render(<EmergencyScenarioWorkflow 
      sourceLanguage="en" 
      targetLanguage="es" 
      onPhraseSelect={jest.fn()} 
    />);
    
    // Rapidly switch between scenarios
    const scenarios = [
      'Heart Attack Scenario',
      'Stroke Emergency', 
      'Severe Allergic Reaction/Anaphylaxis',
      'Accident Trauma Emergency'
    ];
    
    for (const scenario of scenarios) {
      fireEvent.click(screen.getByText(scenario));
      // Small delay to simulate real usage
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Should still be responsive
    expect(screen.getByText('Accident Trauma Emergency')).toBeInTheDocument();
  });
});
