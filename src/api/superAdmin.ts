import apiClient from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  is_super_admin: boolean;
  is_approved: boolean;
  admin_id?: string;
  created_at: string;
}

export const superAdminApi = {
  getUnapprovedAdmins: async (): Promise<User[]> => {
    const response = await apiClient.get('/super-admin/unapproved-admins');
    return response.data.admins;
  },
  
  approveAdmin: async (userId: string): Promise<User> => {
    const response = await apiClient.post(`/super-admin/admins/${userId}/approve`);
    return response.data.user;
  },
  
  rejectAdmin: async (userId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/super-admin/admins/${userId}/reject`);
    return response.data;
  },
};


