import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { userService } from '../services/userService';
import { getJwtSecret } from '../config';

const createResponse = (statusCode: number, body: any): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // CORS for demo
  },
  body: JSON.stringify(body),
});

// JWT secret is fetched lazily via Powertools Parameters cache
const JWT_EXPIRES_IN = '24h';

/* ------------------------------------------------------------------ */
/* Register Handler                                                   */
/* ------------------------------------------------------------------ */
export const register = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!event.body) {
      return createResponse(400, { error: 'Missing request body' });
    }
    const { email, password, name, role, department } = JSON.parse(event.body);

    if (!email || !password || !name || !role) {
      return createResponse(400, { error: 'Missing required fields' });
    }

    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      return createResponse(409, { error: 'Email already registered' });
    }

    const newUser = await userService.createUser({ email, password, name, role, department });

    // Generate token
    const secret = await getJwtSecret();
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      secret,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return createResponse(201, { token, user: { ...newUser, passwordHash: undefined } });
  } catch (error: any) {
    console.error('Register error', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};

/* ------------------------------------------------------------------ */
/* Login Handler                                                      */
/* ------------------------------------------------------------------ */
export const login = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!event.body) {
      return createResponse(400, { error: 'Missing request body' });
    }

    const { email, password } = JSON.parse(event.body);
    if (!email || !password) {
      return createResponse(400, { error: 'Missing email or password' });
    }

    const user = await userService.getUserByEmail(email);
    if (!user || !user.isActive) {
      return createResponse(401, { error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return createResponse(401, { error: 'Invalid credentials' });
    }

    await userService.updateLastLogin(email);

    const secret = await getJwtSecret();
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      secret,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Expose user fields without passwordHash
    const { passwordHash: _, ...safeUser } = user;

    return createResponse(200, { token, user: safeUser });
  } catch (error: any) {
    console.error('Login error', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}; 