export class UserResponse {
  id: number;
  name: string;
  email: string;
  emailVerified?: string;
  accessToken?: string;
  image?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
}