import apiClient from './client';

export interface FormField {
  id: string;
  field_type: string;
  label: string;
  name: string;
  is_required: boolean;
  order: number;
  options?: string;
  placeholder?: string;
}

export interface Form {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  created_at: string;
  fields: FormField[];
}

export interface CreateFormRequest {
  title: string;
  description?: string;
  fields: Array<{
    field_type: string;
    label: string;
    name: string;
    is_required?: boolean;
    order?: number;
    options?: string;
    placeholder?: string;
  }>;
}

export interface UpdateFormRequest {
  title?: string;
  description?: string;
  fields?: Array<{
    field_type: string;
    label: string;
    name: string;
    is_required?: boolean;
    order?: number;
    options?: string;
    placeholder?: string;
  }>;
}

export const formsApi = {
  createForm: async (creatorId: string, data: CreateFormRequest): Promise<Form> => {
    const response = await apiClient.post(`/forms?creator_id=${creatorId}`, data);
    return response.data;
  },
  
  getForm: async (formId: string): Promise<Form> => {
    const response = await apiClient.get(`/forms/${formId}`);
    return response.data;
  },
  
  getFormsByCreator: async (creatorId: string, skip: number = 0, limit: number = 10): Promise<Form[]> => {
    const response = await apiClient.get(`/admin/${creatorId}/forms`, {
      params: { skip, limit }
    });
    return response.data;
  },
  
  updateForm: async (formId: string, data: UpdateFormRequest): Promise<Form> => {
    const response = await apiClient.put(`/forms/${formId}`, data);
    return response.data;
  },
  
  deleteForm: async (formId: string): Promise<void> => {
    await apiClient.delete(`/forms/${formId}`);
  },
  
  getSubmissionCount: async (formId: string): Promise<number> => {
    const response = await apiClient.get(`/forms/${formId}/submissions/count`);
    return response.data.count;
  },
};

