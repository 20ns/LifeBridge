import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { 
  TranscribeClient, 
  StartTranscriptionJobCommand, 
  GetTranscriptionJobCommand,
  TranscriptionJob,
  LanguageCode
} from '@aws-sdk/client-transcribe';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createResponse, createErrorResponse, validateRequestBody } from '../utils/response';

const transcribeClient = new TranscribeClient({
  region: process.env.AWS_REGION || 'eu-north-1',
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
});

// Enhanced language code mappings for medical Transcribe
const transcribeLanguageMap: { [key: string]: LanguageCode } = {
  'en': LanguageCode.EN_US,
  'es': LanguageCode.ES_ES,
  'fr': LanguageCode.FR_FR,
  'de': LanguageCode.DE_DE,
  'pt': LanguageCode.PT_BR,
  'ar': LanguageCode.AR_SA,
  'hi': LanguageCode.HI_IN,
  'ja': LanguageCode.JA_JP,
  'zh': LanguageCode.ZH_CN
};

// Medical context-specific settings for enhanced accuracy
const getMedicalTranscribeSettings = (context?: string) => {
  const baseSettings = {
    ShowSpeakerLabels: true,
    MaxSpeakerLabels: 2, // Doctor-patient conversation
    ShowAlternatives: true,
    MaxAlternatives: 3
  };

  switch (context) {
    case 'emergency':
      return {
        ...baseSettings,
        ChannelIdentification: false, // Single channel for emergency
        VocabularyFilterMethod: 'tag' as const
      };
    case 'consultation':
      return {
        ...baseSettings,
        ChannelIdentification: true, // Multi-speaker identification
        VocabularyFilterMethod: 'tag' as const
      };
    case 'medication':
      return {
        ...baseSettings,
        ShowSpeakerLabels: false, // Usually single speaker for medication
        VocabularyFilterMethod: 'tag' as const
      };
    default:
      return baseSettings;
  }
};

// Common medical terms that should be prioritized in transcription
const getMedicalKeywords = () => [
  'blood pressure', 'heart rate', 'temperature', 'oxygen saturation',
  'chest pain', 'shortness of breath', 'difficulty breathing', 'nausea',
  'headache', 'dizziness', 'fever', 'cough', 'fatigue',
  'medication', 'dosage', 'prescription', 'allergy', 'allergic reaction',
  'emergency', 'urgent', 'severe', 'critical', 'stable'
];

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Enhanced speech-to-text request:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, {}, 'CORS preflight');
    }

    // Validate request method
    if (event.httpMethod !== 'POST') {
      return createErrorResponse(405, 'Method not allowed');
    }

    // Validate request body
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const validation = validateRequestBody(event.body, []);
    if (!validation.isValid) {
      return createErrorResponse(400, validation.error!);
    }

    const { audioData, language, jobId, medicalContext } = validation.data;

    // If jobId is provided, check transcription status
    if (jobId) {
      return await checkTranscriptionStatus(jobId);
    }

    // For starting transcription, validate required fields
    if (!audioData) {
      return createErrorResponse(400, 'Missing required field: audioData');
    }

    if (!language) {
      return createErrorResponse(400, 'Missing required field: language');
    }// Get language code for Transcribe
    const languageCode = transcribeLanguageMap[language] || LanguageCode.EN_US;

    // Generate unique job name
    const timestamp = Date.now();
    const transcriptionJobName = `lifebridge-transcription-${timestamp}`;

    // Decode base64 audio data
    const audioBuffer = Buffer.from(audioData, 'base64');    // Upload audio to S3 (temporary bucket for transcription)
    const bucketName = process.env.TRANSCRIBE_BUCKET || 'lifebridge-transcribe-temp-dev';
    const audioKey = `audio/${transcriptionJobName}.wav`;

    console.log(`Uploading audio to S3: ${bucketName}/${audioKey}`);

    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: audioKey,
      Body: audioBuffer,
      ContentType: 'audio/wav'
    });

    try {
      await s3Client.send(uploadCommand);
      console.log(`Audio uploaded to S3: s3://${bucketName}/${audioKey}`);
    } catch (uploadError) {
      console.error('S3 upload error:', uploadError);
      return createErrorResponse(500, 'Failed to upload audio to S3. Please check AWS credentials and bucket permissions.');
    }    // Get enhanced medical transcription settings
    const medicalSettings = getMedicalTranscribeSettings(medicalContext);
    
    // Start enhanced transcription job with medical optimization
    const transcribeCommand = new StartTranscriptionJobCommand({
      TranscriptionJobName: transcriptionJobName,
      LanguageCode: languageCode,
      Media: {
        MediaFileUri: `s3://${bucketName}/${audioKey}`
      },
      OutputBucketName: bucketName,
      OutputKey: `transcripts/${transcriptionJobName}.json`,
      Settings: {
        ...medicalSettings,
        VocabularyFilterName: undefined, // Could be enhanced with custom medical vocabulary
        VocabularyName: undefined        // Future enhancement: custom medical vocabulary
      },
      MediaFormat: 'wav'
    });

    try {
      const transcribeResponse = await transcribeClient.send(transcribeCommand);
      console.log('Transcription job started:', transcriptionJobName);
      
      return createResponse(200, {
        jobId: transcriptionJobName,
        status: 'IN_PROGRESS',
        message: 'Transcription job started. Use the jobId to check status.'
      }, 'Speech-to-text transcription started');
    } catch (transcribeError) {
      console.error('Transcription start error:', transcribeError);
      return createErrorResponse(500, 'Failed to start transcription job. Please check AWS Transcribe permissions.');
    }

  } catch (error) {
    console.error('Speech-to-text handler error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse(500, 'Speech-to-text failed', errorMessage);
  }
};

const checkTranscriptionStatus = async (jobId: string): Promise<APIGatewayProxyResult> => {
  try {
    const command = new GetTranscriptionJobCommand({
      TranscriptionJobName: jobId
    });

    const response = await transcribeClient.send(command);
    const job = response.TranscriptionJob as TranscriptionJob;

    if (!job) {
      return createErrorResponse(404, 'Transcription job not found');
    }

    if (job.TranscriptionJobStatus === 'COMPLETED' && job.Transcript?.TranscriptFileUri) {
      // Fetch transcript from S3
      const transcriptResponse = await fetch(job.Transcript.TranscriptFileUri);
      const transcriptData = await transcriptResponse.json();
      
      return createResponse(200, {
        jobId,
        status: 'COMPLETED',
        transcript: transcriptData.results.transcripts[0].transcript,
        confidence: calculateAverageConfidence(transcriptData.results.items)
      }, 'Transcription completed successfully');
    }

    if (job.TranscriptionJobStatus === 'FAILED') {
      return createErrorResponse(500, 'Transcription job failed', job.FailureReason);
    }

    return createResponse(200, {
      jobId,
      status: job.TranscriptionJobStatus,
      message: 'Transcription still in progress'
    }, 'Transcription job status retrieved');

  } catch (error) {
    console.error('Error checking transcription status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return createErrorResponse(500, 'Failed to check transcription status', errorMessage);
  }
};

const calculateAverageConfidence = (items: any[]): number => {
  if (!items || items.length === 0) return 0;
  
  const confidenceScores = items
    .filter(item => item.type === 'pronunciation' && item.alternatives?.[0]?.confidence)
    .map(item => parseFloat(item.alternatives[0].confidence));
    
  if (confidenceScores.length === 0) return 0;
  
  return confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
};
