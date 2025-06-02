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
      if (!data[field]) {
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
