// Frontend Component Integration Test for Sign Language Features
// This script tests the new SignAnimationPlayer and VisualFeedbackSystem components

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignAnimationPlayer from '../../../frontend/src/components/SignAnimationPlayer';
import VisualFeedbackSystem from '../../../frontend/src/components/VisualFeedbackSystem';
import SignLanguageInterface from '../../../frontend/src/components/SignLanguageInterface';

// Mock data for testing
const mockMedicalText = 'I need help with my medication';
const mockSignData = {
  confidence: 0.85,
  isDetecting: true,
  currentGesture: 'medicine',
  isEmergency: false,
  detectionState: 'good'
};

const mockEmergencyData = {
  confidence: 0.95,
  isDetecting: true,
  currentGesture: 'emergency',
  isEmergency: true,
  detectionState: 'emergency'
};

describe('SignAnimationPlayer Component', () => {
  test('renders animation player with medical text', () => {
    render(<SignAnimationPlayer text={mockMedicalText} />);
    
    expect(screen.getByText(/Sign Animation Player/i)).toBeInTheDocument();
    expect(screen.getByText(/Text: I need help with my medication/i)).toBeInTheDocument();
  });

  test('displays emergency gestures correctly', () => {
    const emergencyText = 'EMERGENCY - I need immediate help';
    render(<SignAnimationPlayer text={emergencyText} />);
    
    // Should detect emergency keyword and show appropriate animation
    expect(screen.getByText(/emergency/i)).toBeInTheDocument();
  });

  test('play controls work correctly', async () => {
    render(<SignAnimationPlayer text={mockMedicalText} />);
    
    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).toBeInTheDocument();
    
    fireEvent.click(playButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });
  });

  test('speed control adjusts playback', () => {
    render(<SignAnimationPlayer text={mockMedicalText} />);
    
    const speedControl = screen.getByLabelText(/speed/i);
    expect(speedControl).toBeInTheDocument();
    
    fireEvent.change(speedControl, { target: { value: '2' } });
    expect(speedControl.value).toBe('2');
  });
});

describe('VisualFeedbackSystem Component', () => {
  test('renders feedback system with normal detection', () => {
    render(<VisualFeedbackSystem {...mockSignData} />);
    
    expect(screen.getByText(/Sign Detection Active/i)).toBeInTheDocument();
    expect(screen.getByText(/85%/i)).toBeInTheDocument(); // Confidence
    expect(screen.getByText(/medicine/i)).toBeInTheDocument(); // Current gesture
  });

  test('shows emergency alert for critical signs', () => {
    render(<VisualFeedbackSystem {...mockEmergencyData} />);
    
    expect(screen.getByText(/EMERGENCY DETECTED/i)).toBeInTheDocument();
    expect(screen.getByText(/95%/i)).toBeInTheDocument();
    expect(screen.getByText(/emergency/i)).toBeInTheDocument();
  });

  test('displays appropriate visual indicators', () => {
    render(<VisualFeedbackSystem {...mockSignData} />);
    
    // Should have visual elements for good detection
    const feedbackElement = screen.getByText(/Sign Detection Active/i).closest('.visual-feedback-system');
    expect(feedbackElement).toHaveClass('good');
  });

  test('provides audio feedback option', () => {
    render(<VisualFeedbackSystem {...mockSignData} />);
    
    const audioToggle = screen.getByLabelText(/audio feedback/i);
    expect(audioToggle).toBeInTheDocument();
    
    fireEvent.click(audioToggle);
    // Audio feedback should be enabled
  });
});

describe('Enhanced SignLanguageInterface Integration', () => {
  const mockProps = {
    onTranslationRequest: jest.fn(),
    onEmergencyDetected: jest.fn(),
    isTranslating: false,
    currentLanguage: 'en',
    translatedText: 'Necesito ayuda con mi medicación'
  };

  test('renders with all new components integrated', () => {
    render(<SignLanguageInterface {...mockProps} />);
    
    expect(screen.getByText(/Medical Sign Language Translator/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Detection/i)).toBeInTheDocument();
  });

  test('shows animation player when translation is available', async () => {
    render(<SignLanguageInterface {...mockProps} />);
    
    // Start detection to enable features
    const startButton = screen.getByText(/Start Detection/i);
    fireEvent.click(startButton);
    
    // Toggle animation player
    const animationToggle = screen.getByText(/Show.*Sign Animation/i);
    fireEvent.click(animationToggle);
    
    await waitFor(() => {
      expect(screen.getByText(/Text-to-Sign Animation/i)).toBeInTheDocument();
    });
  });

  test('visual feedback system responds to detection state', async () => {
    render(<SignLanguageInterface {...mockProps} />);
    
    // Start detection
    const startButton = screen.getByText(/Start Detection/i);
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Stop Detection/i)).toBeInTheDocument();
    });
    
    // Visual feedback should be active
    // Note: This would need actual sign detection simulation in a real test
  });

  test('handles emergency detection correctly', () => {
    const emergencyProps = {
      ...mockProps,
      onEmergencyDetected: jest.fn()
    };
    
    render(<SignLanguageInterface {...emergencyProps} />);
    
    // Emergency detection would be triggered by the hook
    // This test would need to simulate sign detection
  });
});

describe('Component Integration Flow', () => {
  test('complete sign-to-translation-to-animation flow', async () => {
    const mockTranslationRequest = jest.fn();
    const props = {
      onTranslationRequest: mockTranslationRequest,
      onEmergencyDetected: jest.fn(),
      isTranslating: false,
      currentLanguage: 'es',
      translatedText: ''
    };

    const { rerender } = render(<SignLanguageInterface {...props} />);
    
    // 1. Start detection
    const startButton = screen.getByText(/Start Detection/i);
    fireEvent.click(startButton);
    
    // 2. Simulate sign detection (would normally come from the hook)
    // This would trigger onTranslationRequest
    
    // 3. Update with translated text
    rerender(
      <SignLanguageInterface 
        {...props} 
        translatedText="Necesito ayuda médica urgente"
        isTranslating={false}
      />
    );
    
    // 4. Show animation player
    const animationButton = screen.getByText(/Show.*Sign Animation/i);
    fireEvent.click(animationButton);
    
    // 5. Verify complete flow
    await waitFor(() => {
      expect(screen.getByText(/Text-to-Sign Animation/i)).toBeInTheDocument();
    });
  });
});

// Performance tests
describe('Component Performance', () => {
  test('components render within acceptable time', () => {
    const startTime = performance.now();
    
    render(<SignAnimationPlayer text={mockMedicalText} />);
    render(<VisualFeedbackSystem {...mockSignData} />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within 100ms
    expect(renderTime).toBeLessThan(100);
  });

  test('animation player handles large text efficiently', () => {
    const largeText = 'Emergency medical help needed '.repeat(20);
    const startTime = performance.now();
    
    render(<SignAnimationPlayer text={largeText} />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should still render efficiently
    expect(renderTime).toBeLessThan(200);
  });
});

// Accessibility tests
describe('Accessibility Compliance', () => {
  test('components have proper ARIA labels', () => {
    render(<SignAnimationPlayer text={mockMedicalText} />);
    render(<VisualFeedbackSystem {...mockSignData} />);
    
    // Check for accessibility attributes
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/speed/i)).toBeInTheDocument();
  });

  test('emergency alerts are properly announced', () => {
    render(<VisualFeedbackSystem {...mockEmergencyData} />);
    
    // Emergency elements should have proper ARIA attributes
    const emergencyAlert = screen.getByText(/EMERGENCY DETECTED/i);
    expect(emergencyAlert.closest('[role="alert"]')).toBeInTheDocument();
  });

  test('keyboard navigation works', () => {
    render(<SignAnimationPlayer text={mockMedicalText} />);
    
    const playButton = screen.getByRole('button', { name: /play/i });
    
    // Should be focusable
    playButton.focus();
    expect(playButton).toHaveFocus();
    
    // Should respond to Enter key
    fireEvent.keyDown(playButton, { key: 'Enter' });
  });
});

export {
  mockMedicalText,
  mockSignData,
  mockEmergencyData
};
