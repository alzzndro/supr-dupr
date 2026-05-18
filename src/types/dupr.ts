export interface RatingMetric {
  rating: string;
  verified: boolean;
  halfLife?: number;
}

export interface DuprUserStats {
  singles: string | number;
  singlesVerified: string | number;
  singlesProvisional: boolean;
  doubles: string | number;
  doublesVerified: string | number;
  doublesProvisional: boolean;
  defaultRating: string;
}

export interface DuprUserAddress {
  id: number;
  shortAddress: string;
  formattedAddress: string;
}

export interface DuprUser {
  id: number;
  fullName: string;
  email: string;
  gender: 'MALE' | 'FEMALE';
  referralCode?: string;
  duprId?: string; // For mock data compatibility
  firstName?: string; // For mock data compatibility
  lastName?: string; // For mock data compatibility
  ratings?: { // For mock data compatibility
    singles: RatingMetric;
    doubles: RatingMetric;
  };
  stats?: DuprUserStats; // From real DUPR API response
  addresses?: DuprUserAddress[];
}

export interface LoginResponse {
  status: string;
  message: string;
  result?: {
    accessToken: string;
    refreshToken: string;
    user: DuprUser;
  };
}

export interface ProfileResponse {
  status: string;
  message: string;
  result?: DuprUser;
}
