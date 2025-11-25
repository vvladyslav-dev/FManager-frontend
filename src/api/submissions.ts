import apiClient from './client';

export interface File {
  id: string;
  field_id?: string;
  original_filename: string;
  blob_url: string;
  file_size: number;
  content_type?: string;
}

export interface FormFieldValue {
  id: string;
  field_id: string;
  value?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  is_admin: boolean;
  admin_id?: string;
  created_at: string;
}

export interface FormField {
  id: string;
  field_type: string;
  label: string;
  name: string;
  is_required: boolean;
  order: number;
  options?: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  user_id: string;
  submitted_at: string;
  user?: User;
  form?: {
    id: string;
    title: string;
    description?: string;
    fields?: FormField[];
  };
  field_values: FormFieldValue[];
  files: File[];
}

export const submissionsApi = {
  getSubmissionsByAdmin: async (
    adminId: string, 
    skip: number = 0, 
    limit: number = 10,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      userName?: string;
      userEmail?: string;
      fieldValueSearch?: string;
      formId?: string;
    }
  ): Promise<FormSubmission[]> => {
    const params: any = { skip, limit };
    if (filters?.dateFrom) params.date_from = filters.dateFrom;
    if (filters?.dateTo) params.date_to = filters.dateTo;
    if (filters?.userName) params.user_name = filters.userName;
    if (filters?.userEmail) params.user_email = filters.userEmail;
    if (filters?.fieldValueSearch) params.field_value_search = filters.fieldValueSearch;
    if (filters?.formId) params.form_id = filters.formId;
    
    const response = await apiClient.get(`/admin/${adminId}/submissions`, {
      params
    });
    return response.data;
  },
  
  getSubmissionsByForm: async (formId: string): Promise<FormSubmission[]> => {
    const response = await apiClient.get(`/forms/${formId}/submissions`);
    return response.data;
  },
  
  deleteSubmission: async (submissionId: string): Promise<void> => {
    await apiClient.delete(`/submissions/${submissionId}`);
  },
};

