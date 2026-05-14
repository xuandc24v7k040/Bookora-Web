export interface User {
  id: string
  email: string
  name: string
  role?: string
  avatarUrl?: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: User
}

export interface RefreshTokenResponse {
  accessToken: string
  user?: User
}
