import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, message, Typography } from 'antd';
import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formsApi, CreateFormRequest } from '../api/forms';
import FormFieldEditor from '../components/FormFieldEditor';

const { Text } = Typography;
const { TextArea } = Input;

const CreateFormPage: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [fieldOptions, setFieldOptions] = useState<Record<number, string[]>>({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [fieldErrors, setFieldErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const createFormMutation = useMutation({
    mutationFn: (data: CreateFormRequest) => formsApi.createForm(user.id, data),
    onSuccess: () => {
      message.success(t('createForm.formCreated'));
      queryClient.invalidateQueries({ queryKey: ['forms', user.id] });
      navigate('/forms');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || t('common.error'));
    },
  });

  const generateFieldName = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  };

  const moveField = (fields: any[], index: number, direction: 'up' | 'down', move: (from: number, to: number) => void) => {
    if (direction === 'up' && index > 0) {
      move(index, index - 1);
    } else if (direction === 'down' && index < fields.length - 1) {
      move(index, index + 1);
    }
  };

  const onFinish = (values: any) => {
    // Validate that select/multiselect fields have options
    const fieldsWithErrors: number[] = [];
    const errors: Record<number, boolean> = {};
    (values.fields || []).forEach((field: any, index: number) => {
      if (field.field_type === 'select' || field.field_type === 'multiselect') {
        const options = fieldOptions[index];
        const validOptions = options ? options.filter((opt: string) => opt && opt.trim() !== '') : [];
        if (validOptions.length === 0) {
          fieldsWithErrors.push(index);
          errors[index] = true;
        } else {
          errors[index] = false;
        }
      } else {
        errors[index] = false;
      }
    });

    setFieldErrors(errors);

    if (fieldsWithErrors.length > 0) {
      message.error(t('createForm.pleaseAddOption'));
      // Scroll to first field with error
      const firstErrorIndex = fieldsWithErrors[0];
      const fieldCard = document.querySelector(`[data-field-index="${firstErrorIndex}"]`);
      if (fieldCard) {
        fieldCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Trigger validation for options fields
      form.validateFields().catch(() => {});
      return;
    }

    const fields = (values.fields || []).map((field: any, index: number) => {
      const options = fieldOptions[index];
      return {
        field_type: field.field_type,
        label: field.label,
        name: field.name || generateFieldName(field.label),
        is_required: field.is_required || false,
        order: index,
        options: (field.field_type === 'select' || field.field_type === 'multiselect') && options && options.length > 0 && options.some((opt: string) => opt.trim() !== '')
          ? JSON.stringify(options.filter((opt: string) => opt.trim() !== ''))
          : undefined,
        placeholder: field.placeholder && field.placeholder.trim() !== '' ? field.placeholder.trim() : undefined,
      };
    });

    const formData: CreateFormRequest = {
      title: values.title,
      description: values.description,
      fields,
    };

    createFormMutation.mutate(formData);
  };

  return (
    <div style={{ 
      padding: isMobile ? '16px' : '32px', 
      background: '#FAFBFC', 
      minHeight: '100vh',
      maxWidth: 1200,
      margin: '0 auto'
    }}>
      <div style={{ marginBottom: isMobile ? 24 : 32 }}>
        <h1 style={{ 
          fontSize: isMobile ? 24 : 28, 
          fontWeight: 700, 
          color: '#111827', 
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <QuestionCircleOutlined style={{ color: '#4F46E5', fontSize: isMobile ? 24 : 28 }} />
          {t('createForm.title')}
        </h1>
        <Text style={{ color: '#6B7280', fontSize: 15 }}>
          {t('createForm.addQuestion')}
        </Text>
      </div>

      <Card 
        style={{ 
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #E5E7EB',
          marginBottom: 24
        }}
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            name="title"
            label={<span style={{ fontWeight: 600, color: '#374151', fontSize: 15 }}>{t('createForm.formTitle')}</span>}
            rules={[{ required: true, message: t('createForm.formTitlePlaceholder') }]}
          >
            <Input 
              placeholder={t('createForm.formTitlePlaceholder')} 
              style={{ borderRadius: 8, height: 44, fontSize: 15 }} 
              size="large" 
            />
          </Form.Item>

          <Form.Item 
            name="description" 
            label={<span style={{ fontWeight: 600, color: '#374151', fontSize: 15 }}>{t('createForm.formDescription')}</span>}
          >
            <TextArea 
              rows={3} 
              placeholder={t('createForm.formDescriptionPlaceholder')} 
              style={{ borderRadius: 8, fontSize: 15 }} 
            />
          </Form.Item>

          <div style={{ marginTop: 32, marginBottom: 24 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 24
            }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: 600, 
                color: '#111827' 
              }}>
                {t('createForm.addQuestion')}
              </Text>
            </div>

            <Form.List name="fields">
              {(fields, { add, remove, move }) => {
                return (
                  <>
                    {fields.map(({ key, name, ...restField }, index) => {
                      const fieldValue = form.getFieldValue(['fields', name]);
                      // Initialize options if select/multiselect type is selected but options not initialized
                      if ((fieldValue?.field_type === 'select' || fieldValue?.field_type === 'multiselect')) {
                        if (!fieldOptions[index] || fieldOptions[index].length === 0) {
                          const existingOptions = fieldValue?.options;
                          if (existingOptions) {
                            try {
                              const parsed = JSON.parse(existingOptions);
                              if (Array.isArray(parsed) && parsed.length > 0) {
                                setFieldOptions(prev => ({ ...prev, [index]: parsed }));
                              } else {
                                setFieldOptions(prev => ({ ...prev, [index]: [''] }));
                              }
                            } catch {
                              setFieldOptions(prev => ({ ...prev, [index]: [''] }));
                            }
                          } else {
                            setFieldOptions(prev => ({ ...prev, [index]: [''] }));
                          }
                        }
                      }
                      const currentOptions = fieldOptions[index] || [];
                      
                      return (
                        <FormFieldEditor
                          key={key}
                          fieldIndex={index}
                          restField={restField}
                          name={name}
                          fieldValue={fieldValue}
                          currentOptions={currentOptions}
                          fieldOptions={fieldOptions}
                          setFieldOptions={setFieldOptions}
                          form={form}
                          fieldErrors={fieldErrors}
                          setFieldErrors={setFieldErrors}
                          onRemove={() => {
                            remove(name);
                            // Clean up options when field is removed
                            const newOptions = { ...fieldOptions };
                            delete newOptions[index];
                            // Reindex remaining options
                            const reindexedOptions: Record<number, string[]> = {};
                            Object.keys(newOptions).forEach((key) => {
                              const oldIndex = parseInt(key);
                              if (oldIndex < index) {
                                reindexedOptions[oldIndex] = newOptions[oldIndex];
                              } else if (oldIndex > index) {
                                reindexedOptions[oldIndex - 1] = newOptions[oldIndex];
                              }
                            });
                            setFieldOptions(reindexedOptions);
                            // Clean up errors
                            const newErrors = { ...fieldErrors };
                            delete newErrors[index];
                            const reindexedErrors: Record<number, boolean> = {};
                            Object.keys(newErrors).forEach((key) => {
                              const oldIndex = parseInt(key);
                              if (oldIndex < index) {
                                reindexedErrors[oldIndex] = newErrors[oldIndex];
                              } else if (oldIndex > index) {
                                reindexedErrors[oldIndex - 1] = newErrors[oldIndex];
                              }
                            });
                            setFieldErrors(reindexedErrors);
                          }}
                          onMove={(direction) => moveField(fields, index, direction, move)}
                          canMoveUp={index > 0}
                          canMoveDown={index < fields.length - 1}
                          isMobile={isMobile}
                          showDragHandle={true}
                          showQuestionNumber={true}
                          generateFieldName={generateFieldName}
                        />
                      );
                  })}

                  <Button
                    type="dashed"
                    onClick={() => {
                      const newIndex = fields.length;
                      add();
                      // Initialize empty options for new field
                      setTimeout(() => {
                        setFieldOptions(prev => ({ ...prev, [newIndex]: [] }));
                      }, 0);
                    }}
                    block
                    icon={<PlusOutlined />}
                    style={{
                      height: 56,
                      borderRadius: 12,
                      border: '2px dashed #D1D5DB',
                      fontSize: 15,
                      fontWeight: 500,
                      color: '#6B7280'
                    }}
                  >
                    {t('createForm.addQuestion')}
                  </Button>
                </>
                );
              }}
            </Form.List>
          </div>

          <Form.Item style={{ marginTop: 32 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={createFormMutation.isPending}
                size="large"
                style={{
                  background: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  fontWeight: 500,
                  paddingLeft: 24,
                  paddingRight: 24,
                  height: 44,
                  fontSize: 15,
                  color: '#4F46E5',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.color = '#4338CA';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.color = '#4F46E5';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
              >
                {t('common.save')}
              </Button>
              <Button
                onClick={() => navigate('/forms')}
                size="large"
                style={{ 
                  borderRadius: 8,
                  height: 44,
                  fontSize: 15
                }}
              >
                {t('common.cancel')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreateFormPage;

