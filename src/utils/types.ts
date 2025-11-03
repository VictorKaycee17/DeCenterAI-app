// Unreal API
export interface UnrealRegistrationPayload {
  iss: string;
  iat: number;
  exp: number;
  calls: number;
  paymentToken: string;
  sub: string;
}

export interface UnrealApiKeyResponse {
  key: string;
  hash: string;
  state: {
    wallet: string;
    name: string;
    calls: number;
    updatedAt: number;
    paymentToken: string;
  };
}

export interface UnrealApiKey {
  calls: number;
  chainId: number;
  hash: string;
  key: string;
  name: string;
  paymentToken: string;
  updatedAt: number;
}

export interface UnrealRegisterResponse {
  success: boolean;
  unrealToken?: string;
  error?: string;
}

export interface UnrealRegisterError {
  error: string;
  details?: string;
  requiredBalance?: string;
  balance?: string;
}

export interface UnrealVerifyTokenResponse {
  success: boolean;
  data?: unknown;
  message?: string;
}

export interface ApiKeyError {
  error: string;
}

export interface GetAllApiKeysResponse {
  keys: UnrealApiKey[];
}

export interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
  model: string;
  object: string;
}

// Supabase
export interface UserUnrealTokenType {
  unreal_token: string;
}

export interface UserProfileType {
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
  email?: string | null;
  bio?: string | null;
  profile_image?: string | File | null;
}

export interface ApiKeyType {
  id: number;
  created_at: string;
  user: number;
  provider: string;
  api_key: string;
  api_hash: string | null;
  api_name: string | null;
  payment_token: string | null;
  calls: number | null;
  chain_id: number | null;
  last_used: string | null;
}

export interface ChatHistoryType {
  id: number;
  user_message: string;
  ai_response: string;
  created_at: string;
  user: number;
  model: string;
  object: string;
}
