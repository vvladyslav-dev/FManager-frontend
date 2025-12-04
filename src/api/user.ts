import apiClient from './client';

export const userApi = {
  updateEmail: async (userId: string, email: string): Promise<{ email: string }> => {
    const response = await apiClient.put(`/users/${userId}`, { email });
    return response.data;
  },
  changePassword: async (payload: { old_password: string; new_password: string }): Promise<void> => {
    // Endpoint may vary; adjust accordingly on the backend
    await apiClient.post('/auth/change-password', payload);
  },
  uploadAvatar: async (userId: string, file: File): Promise<{ avatar_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/users/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
