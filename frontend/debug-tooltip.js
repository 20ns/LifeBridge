// Debug script to test tooltip functionality
console.log('🔍 Debug: Checking tooltip implementation...');

// Check if React app is loaded
setTimeout(() => {
  // Find the performance info button
  const infoBtn = document.querySelector('.performance-info-btn');
  console.log('📍 Info button found:', infoBtn);
  
  if (infoBtn) {
    console.log('🔧 Info button styles:', window.getComputedStyle(infoBtn));
    
    // Add click event listener to debug
    infoBtn.addEventListener('click', (e) => {
      console.log('🖱️ Info button clicked!', e);
      
      // Check if tooltip appears after click
      setTimeout(() => {
        const tooltip = document.querySelector('.performance-tooltip');
        console.log('💬 Tooltip found after click:', tooltip);
        
        if (tooltip) {
          console.log('✅ Tooltip styles:', window.getComputedStyle(tooltip));
          console.log('📐 Tooltip position:', {
            top: tooltip.offsetTop,
            left: tooltip.offsetLeft,
            width: tooltip.offsetWidth,
            height: tooltip.offsetHeight,
            visibility: window.getComputedStyle(tooltip).visibility,
            display: window.getComputedStyle(tooltip).display,
            zIndex: window.getComputedStyle(tooltip).zIndex
          });
        } else {
          console.log('❌ Tooltip not found in DOM');
        }
      }, 100);
    });
  } else {
    console.log('❌ Performance info button not found');
  }
  
  // Check the performance toggle container
  const toggleContainer = document.querySelector('.performance-toggle');
  console.log('📦 Performance toggle container:', toggleContainer);
  
  if (toggleContainer) {
    console.log('📦 Container styles:', {
      position: window.getComputedStyle(toggleContainer).position,
      display: window.getComputedStyle(toggleContainer).display,
      overflow: window.getComputedStyle(toggleContainer).overflow
    });
  }
  
}, 2000);
