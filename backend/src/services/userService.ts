import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  department?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

class UserService {
  private dynamoClient: DynamoDBClient;
  private usersTable: string;

  constructor() {
    this.dynamoClient = new DynamoDBClient({
      region: process.env.REGION || process.env.AWS_REGION || 'eu-north-1',
    });
    this.usersTable = process.env.USERS_TABLE || 'lifebridge-users-dev';
  }

  /* ------------------------------------------------------------------ */
  /* Internal helpers                                                   */
  /* ------------------------------------------------------------------ */
  private mapItemToUser(item: any): UserRecord {
    return {
      id: item.id?.S || '',
      email: item.email?.S || '',
      passwordHash: item.passwordHash?.S || '',
      name: item.name?.S || '',
      role: item.role?.S || 'patient',
      department: item.department?.S,
      createdAt: item.createdAt?.S || new Date().toISOString(),
      lastLogin: item.lastLogin?.S,
      isActive: item.isActive?.BOOL ?? true,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                         */
  /* ------------------------------------------------------------------ */
  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const command = new GetItemCommand({
      TableName: this.usersTable,
      Key: {
        email: { S: email.toLowerCase() },
      },
    });

    const result = await this.dynamoClient.send(command);
    if (!result.Item) return null;
    return this.mapItemToUser(result.Item);
  }

  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    department?: string;
  }): Promise<UserRecord> {
    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 10);

    const newUser: UserRecord = {
      id: crypto.randomUUID(),
      email: userData.email.toLowerCase(),
      passwordHash,
      name: userData.name,
      role: userData.role,
      department: userData.department,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const command = new PutItemCommand({
      TableName: this.usersTable,
      Item: {
        id: { S: newUser.id },
        email: { S: newUser.email },
        passwordHash: { S: newUser.passwordHash },
        name: { S: newUser.name },
        role: { S: newUser.role },
        ...(newUser.department && { department: { S: newUser.department } }),
        createdAt: { S: newUser.createdAt },
        isActive: { BOOL: true },
      },
      ConditionExpression: 'attribute_not_exists(email)',
    });

    await this.dynamoClient.send(command);
    return newUser;
  }

  async updateLastLogin(email: string): Promise<void> {
    const command = new UpdateItemCommand({
      TableName: this.usersTable,
      Key: { email: { S: email.toLowerCase() } },
      UpdateExpression: 'SET lastLogin = :ts',
      ExpressionAttributeValues: {
        ':ts': { S: new Date().toISOString() },
      },
    });

    await this.dynamoClient.send(command);
  }
}

export const userService = new UserService(); 