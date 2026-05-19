import { loginSchema } from '@/schemas/auth.schema'
import type { LoginRequest, LoginResponse, User } from '@/types/auth.type'

export const MOCK_AUTH_ACCOUNT = {
  email: 'student@example.com',
  password: '123456',
} as const

const mockUser: User = {
  id: 'mock-user-1',
  email: MOCK_AUTH_ACCOUNT.email,
  name: 'Sinh viên Demo',
  role: 'student',
  avatarUrl: null,
}

let mockAuthenticated = false

export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const validatedPayload = loginSchema.parse(payload)

    if (
      validatedPayload.email !== MOCK_AUTH_ACCOUNT.email ||
      validatedPayload.password !== MOCK_AUTH_ACCOUNT.password
    ) {
      throw {
        message: 'Email hoặc mật khẩu không đúng',
        statusCode: 401,
      }
    }

    mockAuthenticated = true

    return {
      user: mockUser,
    }
  },

  async me(): Promise<User> {
    if (!mockAuthenticated) {
      throw {
        message: 'Chưa đăng nhập',
        statusCode: 401,
      }
    }

    return mockUser
  },

  async logout(): Promise<void> {
    mockAuthenticated = false
    return Promise.resolve()
  },
}
