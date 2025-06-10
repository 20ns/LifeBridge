export interface APIResponse<T = any> {
  statusCode: number;
  headers: {
    'Content-Type': string;
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Headers': string;
    'Access-Control-Allow-Methods': string;
  };
  body: string;
}

export const createResponse = <T>(
  statusCode: number, 
  data: T, 
  message?: string
): APIResponse<T> => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({
      success: statusCode >= 200 && statusCode < 300,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString()
    })
  };
};

export const createErrorResponse = (
  statusCode: number, 
  error: string, 
  details?: any
): APIResponse => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({
      success: false,
      statusCode,
      error,
      details,
      timestamp: new Date().toISOString()
    })
  };
};

export const validateRequestBody = (body: string, requiredFields: string[]): { isValid: boolean; data?: any; error?: string } => {
  try {
    const data = JSON.parse(body);
    
    for (const field of requiredFields) {
      if (!data[field] && data[field] !== 0) { // Allow 0 as valid value
        return {
          isValid: false,
          error: `Missing required field: ${field}`
        };
      }
    }
    
    return {
      isValid: true,
      data
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid JSON in request body'
    };
  }
};

// Specific validation for sign language data
export const validateSignLanguageData = (data: any): { isValid: boolean; error?: string } => {
  // Validate landmarks
  if (!Array.isArray(data.landmarks)) {
    return { isValid: false, error: 'landmarks must be an array' };
  }
  
  if (data.landmarks.length !== 21) {
    return { isValid: false, error: 'landmarks must contain exactly 21 points' };
  }
  
  // Validate each landmark has x, y, z coordinates
  for (let i = 0; i < data.landmarks.length; i++) {
    const landmark = data.landmarks[i];
    if (!landmark || typeof landmark !== 'object' || 
        typeof landmark.x !== 'number' || 
        typeof landmark.y !== 'number' || 
        typeof landmark.z !== 'number') {
      return { isValid: false, error: `Invalid landmark at index ${i}: must have x, y, z coordinates` };
    }
  }
  
  // Validate confidence
  if (typeof data.confidence !== 'number') {
    return { isValid: false, error: 'confidence must be a number' };
  }
  
  if (data.confidence < 0 || data.confidence > 1) {
    return { isValid: false, error: 'confidence must be between 0 and 1' };
  }
  
  // Validate gesture
  if (typeof data.gesture !== 'string' || data.gesture.trim().length === 0) {
    return { isValid: false, error: 'gesture must be a non-empty string' };
  }
  
  return { isValid: true };
};
