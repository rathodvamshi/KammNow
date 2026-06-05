/**
 * Global API Client for resilient network requests.
 * Features:
 * - 10-second timeout
 * - Exponential backoff retries (1s, 2s)
 * - User-friendly error mapping
 */

const TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  for (let i = 0; i <= MAX_RETRIES; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    // Link external signal (from React Query) to internal timeout controller
    const onExternalAbort = () => controller.abort();
    if (options.signal) {
      options.signal.addEventListener('abort', onExternalAbort);
    }
    
    try {
      // Remove console.log data spam to satisfy Phase 1 Task 4
      const response = await fetch(url, { ...options, signal: controller.signal as any });
      clearTimeout(timeoutId);
      if (options.signal) options.signal.removeEventListener('abort', onExternalAbort);
      
      // console.log(`[API] Response status: ${response.status}`);
      if (response.ok) {
        return response;
      }

      // Do NOT retry client errors (400, 401, 403, 404, etc) except 429 Too Many Requests
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }
      
      // If it's the last retry and response is still not ok, we return it 
      // so the caller can parse the JSON error payload.
      if (i === MAX_RETRIES) {
        return response;
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (options.signal) options.signal.removeEventListener('abort', onExternalAbort);
      console.warn(`[API] Network error: ${error.message}`);
      
      if (i === MAX_RETRIES) {
        if (error.name === 'AbortError') {
          throw new Error('Connection timed out. Please try again.');
        }
        throw new Error('Backend not reachable. Please check your internet connection.');
      }
    }
    
    // Exponential backoff: 1s, 2s
    const delay = (i + 1) * 1000;
    // console.log(`[API] Retrying in ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  throw new Error('Server unavailable');
}
