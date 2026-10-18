export interface VerifiedPharmacyIdentity {
  provider: "pharmacy-council";
  subject: string;
  pharmacistLicense: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

export interface PharmacyAuthAdapter {
  authenticate(license: string, password: string): Promise<VerifiedPharmacyIdentity | null>;
  verifyOtp(identity: VerifiedPharmacyIdentity, otp: string): Promise<boolean>;
}
