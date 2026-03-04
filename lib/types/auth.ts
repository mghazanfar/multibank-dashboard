export interface AuthUser {
  id: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
