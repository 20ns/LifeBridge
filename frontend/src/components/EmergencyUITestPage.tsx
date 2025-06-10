import React, { useState, useEffect } from 'react';
import { Smartphone, Tablet, Monitor, Maximize2, Eye, Accessibility } from 'lucide-react';
import EmergencyScenarioWorkflow from './EmergencyScenarioWorkflow';
import EmergencyPhrasesEnhanced from './EmergencyPhrasesEnhanced';
import EmergencyUIControls from './EmergencyUIControls';
import AccessibilityTestingSuite from './AccessibilityTestingSuite';
import '../styles/emergency-themes.css';

interface TestDevice {
  name: string;
  width: number;
  height: number;
  icon: React.ComponentType<any>;
  category: 'mobile' | 'tablet' | 'desktop';
}

const TEST_DEVICES: TestDevice[] = [
  // Mobile devices
  { name: 'iPhone SE', width: 375, height: 667, icon: Smartphone, category: 'mobile' },
  { name: 'iPhone 12/13', width: 390, height: 844, icon: Smartphone, category: 'mobile' },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932, icon: Smartphone, category: 'mobile' },
  { name: 'Samsung Galaxy S20', width: 360, height: 800, icon: Smartphone, category: 'mobile' },
  
  // Tablets
  { name: 'iPad Mini', width: 768, height: 1024, icon: Tablet, category: 'tablet' },
  { name: 'iPad Pro 11"', width: 834, height: 1194, icon: Tablet, category: 'tablet' },
  { name: 'iPad Pro 12.9"', width: 1024, height: 1366, icon: Tablet, category: 'tablet' },
  
  // Desktop
  { name: 'Small Desktop', width: 1280, height: 720, icon: Monitor, category: 'desktop' },
  { name: 'Full HD', width: 1920, height: 1080, icon: Monitor, category: 'desktop' },
  { name: 'Responsive', width: 0, height: 0, icon: Maximize2, category: 'desktop' }
];

const EmergencyUITestPage: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState<TestDevice>(TEST_DEVICES[0]);
  const [isResponsive, setIsResponsive] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [testComponent, setTestComponent] = useState<'scenarios' | 'phrases' | 'accessibility'>('scenarios');
  const [sourceLanguage] = useState('en');
  const [targetLanguage] = useState('es');

  // Update viewport size on window resize
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDeviceSelect = (device: TestDevice) => {
    setSelectedDevice(device);
    setIsResponsive(device.name === 'Responsive');
  };

  const getContainerStyle = (): React.CSSProperties => {
    if (isResponsive || selectedDevice.name === 'Responsive') {
      return {
        width: '100%',
        height: '100vh',
        overflow: 'auto'
      };
    }

    return {
      width: `${selectedDevice.width}px`,
      height: `${selectedDevice.height}px`,
      margin: '20px auto',
      border: '2px solid #333',
      borderRadius: '12px',
      overflow: 'auto',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      backgroundColor: '#fff'
    };
  };

  const handlePhraseSelect = (phrase: string) => {
    console.log('Selected phrase:', phrase);
  };

  return (
    <div className="emergency-container emergency-theme-light">
      {/* Test Controls Header */}
      <div className="emergency-section" style={{ 
        padding: '1rem', 
        backgroundColor: 'var(--emergency-bg-muted)', 
        borderBottom: '2px solid var(--emergency-border)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div className="emergency-grid emergency-grid-4" style={{ gap: '1rem', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--emergency-text)' }}>
              <Eye className="inline mr-2" size={24} />
              Emergency UI Test Page
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--emergency-text-muted)' }}>
              Test emergency UI across different devices and screen sizes
            </p>
          </div>

          {/* Device Selection */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Test Device:
            </label>
            <select 
              value={selectedDevice.name}
              onChange={(e) => {
                const device = TEST_DEVICES.find(d => d.name === e.target.value);
                if (device) handleDeviceSelect(device);
              }}
              className="emergency-input"
              style={{ width: '100%' }}
            >
              <optgroup label="Mobile Devices">
                {TEST_DEVICES.filter(d => d.category === 'mobile').map(device => (
                  <option key={device.name} value={device.name}>
                    {device.name} ({device.width}×{device.height})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Tablets">
                {TEST_DEVICES.filter(d => d.category === 'tablet').map(device => (
                  <option key={device.name} value={device.name}>
                    {device.name} ({device.width}×{device.height})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Desktop">
                {TEST_DEVICES.filter(d => d.category === 'desktop').map(device => (
                  <option key={device.name} value={device.name}>
                    {device.name} {device.width > 0 ? `(${device.width}×${device.height})` : '(Responsive)'}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>          {/* Component Selection */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Test Component:
            </label>
            <div className="emergency-grid emergency-grid-3" style={{ gap: '0.5rem' }}>
              <button
                onClick={() => setTestComponent('scenarios')}
                className={`emergency-btn-secondary ${testComponent === 'scenarios' ? 'emergency-btn-primary' : ''}`}
                style={{ fontSize: '0.875rem', padding: '0.5rem' }}
              >
                Scenarios
              </button>
              <button
                onClick={() => setTestComponent('phrases')}
                className={`emergency-btn-secondary ${testComponent === 'phrases' ? 'emergency-btn-primary' : ''}`}
                style={{ fontSize: '0.875rem', padding: '0.5rem' }}
              >
                Phrases
              </button>
              <button
                onClick={() => setTestComponent('accessibility')}
                className={`emergency-btn-secondary ${testComponent === 'accessibility' ? 'emergency-btn-primary' : ''}`}
                style={{ fontSize: '0.875rem', padding: '0.5rem' }}
              >
                <Accessibility className="inline mr-1" size={16} />
                A11y Tests
              </button>
            </div>
          </div>

          {/* Device Info */}
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--emergency-text-muted)' }}>
              <div><strong>Current:</strong> {selectedDevice.name}</div>
              <div><strong>Size:</strong> {isResponsive ? `${viewportSize.width}×${viewportSize.height}` : `${selectedDevice.width}×${selectedDevice.height}`}</div>
              <div><strong>Category:</strong> {selectedDevice.category}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Device Frame */}
      <div style={{ 
        padding: isResponsive ? '0' : '2rem',
        backgroundColor: isResponsive ? 'transparent' : '#f5f5f5',
        minHeight: isResponsive ? 'auto' : '100vh'
      }}>
        <div style={getContainerStyle()}>
          {/* Emergency UI Controls - Always visible */}
          <EmergencyUIControls />
            {/* Test Component */}
          {testComponent === 'scenarios' ? (
            <EmergencyScenarioWorkflow
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              onPhraseSelect={handlePhraseSelect}
              isEmergencyMode={true}
              accessibilityMode={false}
            />
          ) : testComponent === 'phrases' ? (
            <EmergencyPhrasesEnhanced
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              isEmergencyMode={true}
              largeButtons={selectedDevice.category === 'mobile'}
              accessibilityMode={false}
            />
          ) : (
            <AccessibilityTestingSuite />
          )}
        </div>
      </div>

      {/* Testing Notes */}
      <div className="emergency-section" style={{ 
        padding: '1rem', 
        backgroundColor: 'var(--emergency-bg-muted)', 
        borderTop: '2px solid var(--emergency-border)',
        marginTop: '2rem'
      }}>
        <h3>Testing Guidelines</h3>
        <div className="emergency-grid emergency-grid-3" style={{ gap: '1rem' }}>
          <div>
            <h4>Mobile Testing ({selectedDevice.category === 'mobile' ? '✓ Active' : 'Inactive'})</h4>
            <ul style={{ fontSize: '0.875rem', margin: 0 }}>
              <li>Touch targets ≥ 44px</li>
              <li>One-thumb navigation</li>
              <li>Critical actions prominent</li>
              <li>Large text for stress</li>
            </ul>
          </div>
          <div>
            <h4>Accessibility Testing</h4>
            <ul style={{ fontSize: '0.875rem', margin: 0 }}>
              <li>High contrast mode</li>
              <li>Large text options</li>
              <li>Screen reader support</li>
              <li>Keyboard navigation</li>
            </ul>
          </div>
          <div>
            <h4>Emergency Context</h4>
            <ul style={{ fontSize: '0.875rem', margin: 0 }}>
              <li>Quick access to critical functions</li>
              <li>Clear visual hierarchy</li>
              <li>Minimal cognitive load</li>
              <li>Error prevention</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyUITestPage;
