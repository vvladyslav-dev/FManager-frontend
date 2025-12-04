import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Form, Input, Button, Space, message, Upload, Spin, Alert, DatePicker, Select } from 'antd';
import { UploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formsApi } from '../api/forms';
import apiClient from '../api/client';
import type { UploadFile } from 'antd/es/upload/interface';
import type { Dayjs } from 'dayjs';
import type { Rule } from 'antd/es/form';
import SignatureCanvas from '../components/SignatureCanvas';

const { TextArea } = Input;

interface FormSubmissionData {
  user_name: string;
  user_email?: string;
  field_values: Record<string, string>;
  files: Record<string, File[]>;
}

const SubmitFormPage: React.FC = () => {
  const { t } = useTranslation();
  const { formId } = useParams<{ formId: string }>();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<Record<string, UploadFile[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: formData, isLoading, error } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsApi.getForm(formId!),
    enabled: !!formId,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormSubmissionData) => {
      const formData = new FormData();
      formData.append('user_name', data.user_name);
      if (data.user_email) {
        formData.append('user_email', data.user_email);
      }
      // Always send field_values_json, even if empty
      formData.append('field_values_json', JSON.stringify(data.field_values || {}));
      
      // Append files and create mapping of file index to field_id
      const fileFieldsMapping: Record<string, string> = {};
      let fileIndex = 0;
      
      // First, append all files and build the mapping
      Object.entries(data.files || {}).forEach(([fieldId, files]) => {
        files.forEach((file) => {
          formData.append('files', file);
          fileFieldsMapping[fileIndex.toString()] = fieldId;
          fileIndex++;
        });
      });
      
      // Always append file_fields_json if there are any files
      if (fileIndex > 0) {
        formData.append('file_fields_json', JSON.stringify(fileFieldsMapping));
      }

      // Debug logging
      console.log('Submitting form with:');
      console.log('- Files count:', fileIndex);
      console.log('- File fields mapping:', fileFieldsMapping);
      console.log('- Field values:', data.field_values);
      
      // Log FormData entries
      console.log('FormData keys:', Array.from(formData.keys()));

      const response = await apiClient.post(`/forms/${formId}/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      message.success(t('submitForm.successTitle'));
      setSubmitted(true);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || t('common.error'));
    },
  });

  const onFinish = (values: any) => {
    if (!formData) return;

    const fieldValues: Record<string, string> = {};
    const files: Record<string, File[]> = {};

    // Collect field values (excluding file fields)
    formData.fields?.forEach((field) => {
      if (field.field_type !== 'files') {
        const fieldId = field.id;
        const value = values[`field_${fieldId}`];
        if (value !== undefined && value !== null && value !== '') {
          // Handle DatePicker values (Dayjs objects)
          if (field.field_type === 'date' && typeof value === 'object' && 'format' in value) {
            fieldValues[fieldId] = (value as Dayjs).format('YYYY-MM-DD');
          } 
          // Handle multiselect values (arrays)
          else if (field.field_type === 'multiselect' && Array.isArray(value)) {
            fieldValues[fieldId] = JSON.stringify(value);
          } 
          else {
            fieldValues[fieldId] = String(value);
          }
        }
      }
    });

    // Collect files
    Object.entries(fileList).forEach(([fieldId, filesList]) => {
      if (filesList && filesList.length > 0) {
        files[fieldId] = filesList.map(f => f.originFileObj as File).filter(Boolean);
      }
    });

    submitMutation.mutate({
      user_name: values.user_name,
      user_email: values.user_email,
      field_values: fieldValues,
      files,
    });
  };

  const handleFileChange = (fieldId: string, fileList: UploadFile[]) => {
    setFileList((prev) => ({
      ...prev,
      [fieldId]: fileList,
    }));
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Alert
          message="Form not found"
          description="The form you are looking for does not exist or is no longer available."
          type="error"
          showIcon
        />
      </div>
    );
  }


  if (submitted) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        background: '#FAFBFC',
        padding: '24px'
      }}>
        <Card 
          style={{ 
            width: '100%',
            maxWidth: 500, 
            textAlign: 'center',
            borderRadius: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #E5E7EB'
          }}
          bodyStyle={{ padding: '48px' }}
        >
          <CheckCircleOutlined style={{ fontSize: 64, color: '#10B981', marginBottom: 24 }} />
          <h2 style={{ marginBottom: 16, fontWeight: 600, color: '#1F2937', fontSize: 24 }}>{t('submitForm.successTitle')}</h2>
          <p style={{ fontSize: 15, color: '#6B7280' }}>{t('submitForm.successMessage')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '32px', 
      background: '#FAFBFC', 
      minHeight: '100vh' 
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Card 
          title={<h1 style={{ margin: 0, fontWeight: 600, color: '#1F2937', fontSize: isMobile ? 24 : 28 }}>{formData.title}</h1>}
          style={{
            borderRadius: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #E5E7EB'
          }}
        >
          {formData.description && (
            <p style={{ marginBottom: 32, color: '#6B7280', fontSize: 15, lineHeight: 1.6 }}>{formData.description}</p>
          )}
          
          <Form form={form} onFinish={onFinish} layout="vertical">
            <Form.Item
              name="user_name"
              label={<span style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>{t('submitForm.yourName')}</span>}
              rules={[{ required: true, message: t('submitForm.enterName') }]}
            >
              <Input placeholder={t('submitForm.enterName')} style={{ borderRadius: 8, height: 44, fontSize: 15 }} size="large" />
            </Form.Item>

            <Form.Item
              name="user_email"
              label={<span style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>{t('submitForm.yourEmail')}</span>}
              rules={[{ type: 'email', message: t('submitForm.enterEmail') }]}
            >
              <Input placeholder={t('submitForm.enterEmail')} style={{ borderRadius: 8, height: 44, fontSize: 15 }} size="large" />
            </Form.Item>

            {formData.fields && formData.fields.length > 0 && (
              <>
                <div style={{ 
                  marginTop: 32, 
                  marginBottom: 24,
                  paddingBottom: 16,
                  borderBottom: '1px solid #E5E7EB'
                }}>
                  <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18, color: '#1F2937' }}>{t('submitForm.formFields')}</h3>
                </div>
                {formData.fields
                  .sort((a, b) => a.order - b.order)
                  .map((field) => {
                    // Clean label from asterisks at the beginning
                    const cleanLabel = field.label.replace(/^\s*\*\s*/, '').trim();
                    
                    const fieldRules: Rule[] = [];
                    if (field.is_required) {
                      if (field.field_type === 'files') {
                        // Custom validation for file fields
                        fieldRules.push({
                          validator: (_: any) => {
                            const files = fileList[field.id];
                            if (!files || files.length === 0) {
                              return Promise.reject(new Error(t('submitForm.fillField', { fieldLabel: cleanLabel.toLowerCase() })));
                            }
                            return Promise.resolve();
                          },
                        });
                      } else {
                        // For text fields, validate that value is not empty and not just whitespace
                        fieldRules.push({
                          validator: (_: any, value: any) => {
                            if (!value || (typeof value === 'string' && value.trim().length === 0)) {
                              return Promise.reject(new Error(t('submitForm.fillField', { fieldLabel: cleanLabel.toLowerCase() })));
                            }
                            return Promise.resolve();
                          },
                        });
                      }
                    }

                    // Add specific validation for email and phone fields
                    if (field.field_type === 'email') {
                      fieldRules.push({
                        type: 'email' as const,
                        message: 'Please enter a valid email address',
                      });
                    } else if (field.field_type === 'phone') {
                      fieldRules.push({
                        pattern: /^[\d\s\-\+\(\)]+$/,
                        message: 'Please enter a valid phone number',
                      });
                    }
                    
                    return (
                      <Form.Item
                        key={field.id}
                        name={`field_${field.id}`}
                        label={
                          <span style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>
                            {cleanLabel}
                            {field.is_required && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
                          </span>
                        }
                        rules={fieldRules}
                      >
                        {field.field_type === 'textarea' ? (
                          <TextArea 
                            rows={4} 
                            placeholder={field.placeholder || t('submitForm.enterField', { fieldLabel: cleanLabel.toLowerCase() })}
                            style={{ borderRadius: 8, fontSize: 15 }}
                            size="large"
                          />
                        ) : field.field_type === 'files' ? (
                          <Upload
                            fileList={fileList[field.id] || []}
                            onChange={({ fileList }) => {
                              handleFileChange(field.id, fileList);
                              // Trigger validation after file selection
                              form.validateFields([`field_${field.id}`]);
                            }}
                            beforeUpload={() => false}
                            multiple
                          >
                            <Button 
                              icon={<UploadOutlined />}
                              style={{ borderRadius: 8, height: 44 }}
                              size="large"
                            >
                              {t('submitForm.selectFile')}
                            </Button>
                          </Upload>
                        ) : field.field_type === 'number' ? (
                          <Input 
                            type="number" 
                            placeholder={field.placeholder || t('submitForm.enterField', { fieldLabel: cleanLabel.toLowerCase() })}
                            style={{ borderRadius: 8, height: 44, fontSize: 15 }}
                            size="large"
                          />
                        ) : field.field_type === 'email' ? (
                          <Input 
                            type="email" 
                            placeholder={field.placeholder || t('submitForm.enterEmail')}
                            style={{ borderRadius: 8, height: 44, fontSize: 15 }}
                            size="large"
                          />
                        ) : field.field_type === 'phone' ? (
                          <Input 
                            type="tel" 
                            placeholder={field.placeholder || '+1 (555) 123-4567'}
                            style={{ borderRadius: 8, height: 44, fontSize: 15 }}
                            size="large"
                          />
                        ) : field.field_type === 'date' ? (
                          <DatePicker
                            style={{ borderRadius: 8, height: 44, fontSize: 15, width: '100%' }}
                            size="large"
                            placeholder={field.placeholder || t('submitForm.selectField', { fieldLabel: cleanLabel.toLowerCase() })}
                            format="YYYY-MM-DD"
                          />
                        ) : field.field_type === 'select' ? (
                          <Select
                            placeholder={field.placeholder || t('submitForm.selectField', { fieldLabel: cleanLabel.toLowerCase() })}
                            style={{ borderRadius: 8, height: 44, fontSize: 15 }}
                            size="large"
                          >
                            {field.options && (() => {
                              try {
                                const options = JSON.parse(field.options);
                                return Array.isArray(options) ? options.map((opt: string, idx: number) => (
                                  <Select.Option key={idx} value={opt}>{opt}</Select.Option>
                                )) : null;
                              } catch {
                                return null;
                              }
                            })()}
                          </Select>
                        ) : field.field_type === 'multiselect' ? (
                          <Select
                            mode="multiple"
                            placeholder={field.placeholder || t('submitForm.selectField', { fieldLabel: cleanLabel.toLowerCase() })}
                            style={{ borderRadius: 8, fontSize: 15 }}
                            size="large"
                          >
                            {field.options && (() => {
                              try {
                                const options = JSON.parse(field.options);
                                return Array.isArray(options) ? options.map((opt: string, idx: number) => (
                                  <Select.Option key={idx} value={opt}>{opt}</Select.Option>
                                )) : null;
                              } catch {
                                return null;
                              }
                            })()}
                          </Select>
                        ) : field.field_type === 'signature' ? (
                          <SignatureCanvas 
                            width={isMobile ? 300 : 500}
                            height={200}
                          />
                        ) : (
                          <Input 
                            placeholder={field.placeholder || t('submitForm.enterField', { fieldLabel: cleanLabel.toLowerCase() })}
                            style={{ borderRadius: 8, height: 44, fontSize: 15 }}
                            size="large"
                          />
                        )}
                      </Form.Item>
                    );
                  })}
              </>
            )}

            <Form.Item style={{ marginTop: 32 }}>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large" 
                  loading={submitMutation.isPending}
                  style={{
                    background: '#4F46E5',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 500,
                    paddingLeft: 32,
                    paddingRight: 32,
                    height: 44,
                    fontSize: 15,
                    boxShadow: '0 1px 2px rgba(79, 70, 229, 0.2)'
                  }}
                >
                  {t('submitForm.submitButton')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default SubmitFormPage;

