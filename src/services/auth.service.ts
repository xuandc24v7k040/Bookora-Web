import type { LoginRequest, LoginResponse, User } from '@/types/auth'

export const MOCK_AUTH_ACCOUNT = {
  email: 'student@example.com',
  password: '123456',
} as const

const mockUser: User = {
  id: 'mock-user-1',
  email: MOCK_AUTH_ACCOUNT.email,
  name: 'Student Demo',
  role: 'student',
  avatarUrl: null,
}

export const authService = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    if (
      payload.email !== MOCK_AUTH_ACCOUNT.email ||
      payload.password !== MOCK_AUTH_ACCOUNT.password
    ) {
      throw {
        message: 'Invalid email or password',
        statusCode: 401,
      }
    }

    return {
      accessToken: 'mock-access-token',
      user: mockUser,
    }
  },

  async me(): Promise<User> {
    return mockUser
  },

  async logout(): Promise<void> {
    return Promise.resolve()
  },
}
