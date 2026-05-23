import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_COUNT = '@otp_request_count';
const STORAGE_KEY_LOCK = '@otp_lock_until';

const MAX_RETRIES = 3;
const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export const checkOtpRateLimit = async (): Promise<{ locked: boolean; lockUntil?: number }> => {
  try {
    const lockUntilStr = await AsyncStorage.getItem(STORAGE_KEY_LOCK);
    if (lockUntilStr) {
      const lockUntil = parseInt(lockUntilStr, 10);
      if (Date.now() < lockUntil) {
        return { locked: true, lockUntil };
      } else {
        // Lock expired, reset state
        await AsyncStorage.removeItem(STORAGE_KEY_LOCK);
        await AsyncStorage.removeItem(STORAGE_KEY_COUNT);
        return { locked: false };
      }
    }
    return { locked: false };
  } catch (err) {
    return { locked: false };
  }
};

export const recordOtpRequest = async (): Promise<{ locked: boolean; lockUntil?: number }> => {
  try {
    const { locked } = await checkOtpRateLimit();
    if (locked) return checkOtpRateLimit();

    const countStr = await AsyncStorage.getItem(STORAGE_KEY_COUNT);
    let count = countStr ? parseInt(countStr, 10) : 0;
    count += 1;

    if (count >= MAX_RETRIES) {
      const lockUntil = Date.now() + LOCK_DURATION_MS;
      await AsyncStorage.setItem(STORAGE_KEY_LOCK, lockUntil.toString());
      return { locked: true, lockUntil };
    } else {
      await AsyncStorage.setItem(STORAGE_KEY_COUNT, count.toString());
      return { locked: false };
    }
  } catch (err) {
    return { locked: false };
  }
};
