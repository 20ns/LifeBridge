import React from 'react';

interface GestureGuideProps {
  isVisible: boolean;
  onClose: () => void;
}

const GestureGuide: React.FC<GestureGuideProps> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  const gestures = [
    {
      name: '🚨 Emergency',
      instruction: 'Make a CLOSED FIST and hold for 2 seconds',
      description: 'All fingers folded into palm, thumb tucked in',
      priority: 'CRITICAL',
      color: 'text-red-600'
    },
    {
      name: '🆘 Help',
      instruction: 'Raise ALL FIVE FINGERS and wave',
      description: 'All fingers extended and spread apart',
      priority: 'CRITICAL',
      color: 'text-red-600'
    },
    {
      name: '😣 Pain',
      instruction: 'Point with TWO FINGERS (index + middle)',
      description: 'Only index and middle fingers extended',
      priority: 'HIGH',
      color: 'text-orange-600'
    },
    {
      name: '💊 Medicine',
      instruction: 'Show THUMB + PINKY only',
      description: 'Thumb out, pinky extended, other fingers down',
      priority: 'HIGH',
      color: 'text-orange-600'
    },
    {
      name: '👩‍⚕️ Doctor',
      instruction: 'Point UP with INDEX FINGER',
      description: 'Only index finger pointing upward',
      priority: 'HIGH',
      color: 'text-orange-600'
    },
    {
      name: '💧 Water',
      instruction: 'Show THREE FINGERS (thumb + index + middle)',
      description: 'Thumb, index, and middle fingers extended',
      priority: 'MEDIUM',
      color: 'text-blue-600'
    },
    {
      name: '✅ Yes',
      instruction: 'THUMBS UP only',
      description: 'Only thumb extended upward',
      priority: 'MEDIUM',
      color: 'text-green-600'
    },
    {
      name: '❌ No',
      instruction: 'Point INDEX FINGER DOWN',
      description: 'Index finger pointing downward',
      priority: 'MEDIUM',
      color: 'text-gray-600'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              📚 Medical Sign Language Guide
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Important Tips:</h3>
            <ul className="text-blue-700 space-y-1 text-sm">
              <li>• Hold gestures steady for 2-3 seconds for better detection</li>
              <li>• Keep your hand clearly visible to the camera</li>
              <li>• Emergency gestures require the FULL 2-second hold</li>
              <li>• Good lighting and hand positioning improve accuracy</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gestures.map((gesture, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{gesture.name}</h3>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      gesture.priority === 'CRITICAL'
                        ? 'bg-red-100 text-red-800'
                        : gesture.priority === 'HIGH'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {gesture.priority}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <p className={`font-medium ${gesture.color}`}>
                    {gesture.instruction}
                  </p>
                  <p className="text-sm text-gray-600">
                    {gesture.description}
                  </p>
                  
                  {gesture.name.includes('Emergency') && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                      ⚠️ Must hold for FULL 2 seconds to confirm emergency
                    </div>
                  )}
                  
                  {gesture.name.includes('Help') && (
                    <div className="mt-2 p-2 bg-orange-50 rounded text-xs text-orange-700">
                      🆘 Wave all fingers to ensure detection
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">🔧 Troubleshooting:</h3>
            <ul className="text-gray-700 space-y-1 text-sm">
              <li>• <strong>Low confidence:</strong> Hold gesture more steadily, improve lighting</li>
              <li>• <strong>No detection:</strong> Ensure hand is fully visible in camera frame</li>
              <li>• <strong>Wrong gesture:</strong> Check finger positions match the descriptions</li>
              <li>• <strong>Emergency not working:</strong> Make sure ALL fingers are completely folded into fist</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestureGuide;
