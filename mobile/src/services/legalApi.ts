import apiClient from '../api/client';

export const fetchLegalAcceptance = async (userId?: string): Promise<boolean> => {
  try {
    const { data } = await apiClient.get('/users/me/legal-acceptance');
    return data.accepted ?? false;
  } catch (error) {
    console.error('Error fetching legal acceptance:', error);
    return false;
  }
};

export const submitLegalAcceptance = async (userId?: string): Promise<boolean> => {
  try {
    await apiClient.post('/users/me/legal-acceptance');
    return true;
  } catch (error) {
    console.error('Error submitting legal acceptance:', error);
    return false;
  }
};
