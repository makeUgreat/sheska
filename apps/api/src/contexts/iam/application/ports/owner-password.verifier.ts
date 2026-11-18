export interface OwnerPasswordVerifier {
  matches(password: string): Promise<boolean>;
}
