/**
 * firebaseAuth.ts
 * Modular wrapper around @react-native-firebase/auth for phone OTP.
 * Handles Android + iOS natively without any web fallback.
 */
import { 
  FirebaseAuthTypes, 
  getAuth, 
  signInWithPhoneNumber, 
  onAuthStateChanged, 
  signOut,
  PhoneAuthProvider
} from '@react-native-firebase/auth';

class FirebaseAuthService {
  constructor() {
    if (__DEV__) {
      // Disable app verification (reCAPTCHA/SafetyNet) for local development
      // Make sure to register your test numbers in the Firebase Console!
      getAuth().settings.appVerificationDisabledForTesting = true;
    }
  }


  /**
   * Sends OTP SMS to the given E.164 formatted phone number.
   *
   * @returns verificationId — pass this to verifyOtp()
   */
  async sendOtp(phoneE164: string): Promise<string> {
    try {
      const authInstance = getAuth();
      const confirmation = await signInWithPhoneNumber(authInstance, phoneE164);
      if (!confirmation.verificationId) {
        throw new Error('No verification ID returned from Firebase.');
      }
      return confirmation.verificationId;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Verifies the 6-digit OTP code entered by the user.
   */
  async verifyOtp(
    verificationId: string,
    code: string
  ): Promise<FirebaseAuthTypes.User> {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const authInstance = getAuth();
      const result = await authInstance.signInWithCredential(credential);
      if (!result.user) throw new Error('Authentication failed. Please try again.');
      return result.user;
    } catch (error: any) {
      throw error;
    }
  }

  getCurrentUser(): FirebaseAuthTypes.User | null {
    return getAuth().currentUser;
  }

  onAuthStateChanged(
    callback: (user: FirebaseAuthTypes.User | null) => void
  ): () => void {
    const authInstance = getAuth();
    return onAuthStateChanged(authInstance, callback);
  }

  async getIdToken(forceRefresh = false): Promise<string | null> {
    try {
      const user = getAuth().currentUser;
      if (!user) return null;
      return await user.getIdToken(forceRefresh);
    } catch {
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      const authInstance = getAuth();
      await signOut(authInstance);
    } catch (error: any) {
      console.warn('[FirebaseAuth] signOut error:', error.message);
    }
  }

  public parseFirebaseError(codeOrMessage: string): string {
    const errors: Record<string, string> = {
      'auth/invalid-phone-number': 'Invalid phone number.',
      'auth/too-many-requests': 'Too many requests. Wait a few minutes.',
      'auth/invalid-verification-code': 'Incorrect OTP.',
      'auth/code-expired': 'OTP has expired.',
      'auth/session-expired': 'Session expired.',
      'auth/quota-exceeded': 'SMS quota exceeded.',
    };

    if (errors[codeOrMessage]) return errors[codeOrMessage];
    for (const [key, value] of Object.entries(errors)) {
      if (codeOrMessage?.includes(key)) return value;
    }
    return 'Something went wrong. Please try again.';
  }
}

export const firebaseAuth = new FirebaseAuthService();
export type { FirebaseAuthTypes };
