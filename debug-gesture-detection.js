// Debug script for testing gesture detection in browser console
// To use: Open browser dev tools, paste this in console while on sign language page

function debugGestureDetection() {
  console.log('🔍 Starting gesture detection debug mode...');
  console.log('Make gestures and watch the console for detailed detection info');
  console.log('');
  console.log('Expected gestures:');
  console.log('🚨 Emergency: CLOSED FIST (all fingers folded into palm)');
  console.log('✅ Yes: THUMBS UP (only thumb extended upward)');
  console.log('🆘 Help: ALL FINGERS extended and spread');
  console.log('😣 Pain: INDEX + MIDDLE fingers only');
  console.log('💊 Medicine: THUMB + PINKY only');
  console.log('👩‍⚕️ Doctor: INDEX finger pointing up only');
  console.log('💧 Water: THUMB + INDEX + MIDDLE (3 fingers)');
  console.log('❌ No: INDEX finger pointing down');
  console.log('');
  console.log('Watch for console logs starting with:');
  console.log('- [GestureAnalysis] - Shows which fingers are detected as up/down');
  console.log('- [ThumbDetection] - Shows thumb position calculations');
  console.log('- [FistValidation] - Shows fist detection scoring');
  console.log('- [SignLangDetector] - Shows final gesture results');
  console.log('');
  console.log('If emergency fist keeps showing as "Yes":');
  console.log('1. Check [ThumbDetection] logs - thumb should NOT be detected as up');
  console.log('2. Check [FistValidation] logs - should show 4/5 or 5/5 score');
  console.log('3. Make sure ALL fingers are completely folded into your palm');
  console.log('4. Try tucking your thumb UNDER your other fingers');
}

// Add visual indicator to page
function addDebugIndicator() {
  const debugDiv = document.createElement('div');
  debugDiv.id = 'gesture-debug-indicator';
  debugDiv.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #ff6b6b;
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    max-width: 300px;
  `;
  debugDiv.innerHTML = `
    🔍 GESTURE DEBUG MODE ACTIVE<br>
    Check console for detailed logs<br>
    <small>Emergency fist = ALL fingers folded tight</small>
  `;
  document.body.appendChild(debugDiv);
  
  // Remove after 10 seconds
  setTimeout(() => {
    const indicator = document.getElementById('gesture-debug-indicator');
    if (indicator) indicator.remove();
  }, 10000);
}

// Run debug setup
debugGestureDetection();
addDebugIndicator();

console.log('✅ Debug mode activated! Make gestures and watch the logs above.');
