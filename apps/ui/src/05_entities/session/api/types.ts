import { type ApiRequest, type ApiResponse, type AuthApi } from '@sheska/contract';

export type LogInRequest = ApiRequest<typeof AuthApi.logIn>;
export type SessionResponse = ApiResponse<typeof AuthApi.session>;
