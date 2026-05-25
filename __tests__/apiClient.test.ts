import { apiFetch } from '../src/utils/apiClient';

describe('apiClient', () => {
  it('should be defined', () => {
    expect(apiFetch).toBeDefined();
  });
});
