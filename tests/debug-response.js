// Debug test to see actual response structure
const AWS_API_BASE = 'http://localhost:3001/dev';

async function debugResponse() {
  console.log('🔍 Debugging response structure...');
  
  // First, start a transcription job
  const startResponse = await fetch(`${AWS_API_BASE}/speech-to-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audioData: Buffer.alloc(1024).toString('base64'),
      language: 'en'
    })
  });

  const startData = await startResponse.json();
  console.log('🚀 Start response:', JSON.stringify(startData, null, 2));
  
  // Then check status
  setTimeout(async () => {
    const statusResponse = await fetch(`${AWS_API_BASE}/speech-to-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: startData.data.jobId
      })
    });

    const statusData = await statusResponse.json();
    console.log('📊 Status response:', JSON.stringify(statusData, null, 2));
  }, 3000);
}

debugResponse().catch(console.error);
