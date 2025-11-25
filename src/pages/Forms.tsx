import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Space, message, notification, InputNumber, Switch, Empty, Tag, Modal, Popconfirm, Select, Typography, Row, Col, Upload, Divider, DatePicker, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CopyOutlined, CheckCircleOutlined, EyeOutlined, CalendarOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient, useInfiniteQuery, useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formsApi, CreateFormRequest, UpdateFormRequest, Form as FormType } from '../api/forms';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import FormFieldEditor from '../components/FormFieldEditor';

const { Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const Forms: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [editForm] = Form.useForm();
  const [editingForm, setEditingForm] = useState<FormType | null>(null);
  const [previewForm, setPreviewForm] = useState<FormType | null>(null);
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);
  const [searchTitle, setSearchTitle] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [editFieldOptions, setEditFieldOptions] = useState<Record<number, string[]>>({});
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['forms', user.id, searchTitle, dateRange],
    queryFn: ({ pageParam = 0 }) => {
      return formsApi.getFormsByCreator(user.id, pageParam, 10);
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length * 10 : undefined;
    },
    initialPageParam: 0,
  });

  // Flatten all pages into a single array
  const forms = useMemo(() => {
    return data?.pages.flat() || [];
  }, [data]);

  // Filter forms based on search and date range
  const filteredForms = useMemo(() => {
    if (!forms) return [];
    
    return forms.filter((form: FormType) => {
      // Filter by title
      if (searchTitle && !form.title.toLowerCase().includes(searchTitle.toLowerCase())) {
        return false;
      }
      
      // Filter by date range
      if (dateRange && dateRange[0] && dateRange[1]) {
        const formDate = dayjs(form.created_at);
        const startDate = dateRange[0].startOf('day');
        const endDate = dateRange[1].endOf('day');
        
        if (formDate.isBefore(startDate) || formDate.isAfter(endDate)) {
          return false;
        }
      }
      
      return true;
    });
  }, [forms, searchTitle, dateRange]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const updateFormMutation = useMutation({
    mutationFn: ({ formId, data }: { formId: string; data: UpdateFormRequest }) => 
      formsApi.updateForm(formId, data),
    onSuccess: () => {
      message.success(t('forms.formUpdated'));
      queryClient.invalidateQueries({ queryKey: ['forms', user.id] });
      editForm.resetFields();
      setEditingForm(null);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || t('common.error'));
    },
  });

  const deleteFormMutation = useMutation({
    mutationFn: (formId: string) => formsApi.deleteForm(formId),
    onSuccess: () => {
      message.success(t('forms.formDeleted'));
      queryClient.invalidateQueries({ queryKey: ['forms', user.id] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || t('common.error'));
    },
  });

  // Generate field name from label automatically
  const generateFieldName = (label: string): string => {
    return label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/-+/g, '_') // Replace hyphens with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single underscore
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  };

  // Get submission counts for all forms
  const submissionCountQueries = useQueries({
    queries: filteredForms.map((form: FormType) => ({
      queryKey: ['submissionCount', form.id],
      queryFn: () => formsApi.getSubmissionCount(form.id),
      enabled: !!form.id,
    })),
  });

  // Create a map of form IDs to submission counts
  const submissionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredForms.forEach((form: FormType, index: number) => {
      counts[form.id] = submissionCountQueries[index]?.data || 0;
    });
    return counts;
  }, [filteredForms, submissionCountQueries]);

  const onEditFinish = (values: any) => {
    if (!editingForm) return;
    
    // Validate that select/multiselect fields have options
    const fieldsWithErrors: string[] = [];
    (values.fields || []).forEach((field: any, index: number) => {
      if (field.field_type === 'select' || field.field_type === 'multiselect') {
        const options = editFieldOptions[index];
        const validOptions = options ? options.filter((opt: string) => opt && opt.trim() !== '') : [];
        if (validOptions.length === 0) {
          fieldsWithErrors.push(field.label || `Field ${index + 1}`);
        }
      }
    });

    if (fieldsWithErrors.length > 0) {
      message.error(t('createForm.pleaseAddOption'));
      return;
    }
    
    const formData: UpdateFormRequest = {
      title: values.title,
      description: values.description,
      fields: (values.fields || []).map((field: any, index: number) => {
        const options = editFieldOptions[index];
        return {
          label: field.label,
          name: generateFieldName(field.label || 'field'),
          field_type: field.field_type,
          is_required: field.is_required || false,
          order: index,
          options: (field.field_type === 'select' || field.field_type === 'multiselect') && options && options.length > 0 && options.some((opt: string) => opt.trim() !== '')
            ? JSON.stringify(options.filter((opt: string) => opt.trim() !== ''))
            : undefined,
          placeholder: field.placeholder && field.placeholder.trim() !== '' ? field.placeholder.trim() : undefined,
        };
      }),
    };
    updateFormMutation.mutate({ formId: editingForm.id, data: formData });
  };

  const handleCopyLink = (formId: string) => {
    // Public form submission URL - users can fill the form at this URL
    const formUrl = `${window.location.origin}/submit-form/${formId}`;
    navigator.clipboard.writeText(formUrl).then(() => {
      // Set copied state for visual feedback
      setCopiedFormId(formId);
      
      // Show notification with animation
      notification.success({
        message: t('forms.linkCopied'),
        description: t('forms.linkCopiedDescription'),
        placement: 'topRight',
        duration: 2,
        icon: <CheckCircleOutlined style={{ color: '#10B981' }} />,
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedFormId(null);
      }, 2000);
    }).catch(() => {
      message.error(t('forms.failedToCopyLink'));
    });
  };

  const handleEdit = (formItem: FormType) => {
    setEditingForm(formItem);
    // Initialize field options for select/multiselect fields
    const initialOptions: Record<number, string[]> = {};
    formItem.fields.forEach((field, index) => {
      if ((field.field_type === 'select' || field.field_type === 'multiselect') && field.options) {
        try {
          const parsed = JSON.parse(field.options);
          if (Array.isArray(parsed)) {
            initialOptions[index] = parsed;
          }
        } catch {
          // Invalid JSON, ignore
        }
      }
    });
    setEditFieldOptions(initialOptions);
    
    editForm.setFieldsValue({
      title: formItem.title,
      description: formItem.description,
      fields: formItem.fields.map(field => ({
        label: field.label,
        field_type: field.field_type,
        is_required: field.is_required,
        order: field.order,
        options: field.options,
        placeholder: field.placeholder,
      })),
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ 
          fontSize: 30, 
          fontWeight: 600, 
          color: '#1F2937', 
          margin: 0,
          marginBottom: 8,
          letterSpacing: '-0.02em'
        }}>
          Forms
        </h1>
        <Text style={{ color: '#6B7280', fontSize: 15 }}>
          Create and manage your forms
        </Text>
      </div>

      {/* Filters */}
      <Card 
        style={{ 
          marginBottom: 24, 
          borderRadius: 12, 
          border: '1px solid #E5E7EB',
          backgroundColor: '#fff'
        }}
        bodyStyle={{ padding: '20px' }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 4 }}>
                {t('forms.searchByTitle')}
              </Text>
              <Input
                placeholder={t('forms.searchByTitle')}
                prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                style={{ borderRadius: 8 }}
                size="large"
                allowClear
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 4 }}>
                {t('forms.dateRange')}
              </Text>
              <RangePicker
                placeholder={[t('forms.startDate'), t('forms.endDate')]}
                style={{ width: '100%', borderRadius: 8 }}
                size="large"
                value={dateRange}
                onChange={(dates) => setDateRange(dates)}
                format="YYYY-MM-DD"
              />
            </div>
          </Col>
        </Row>
        {(searchTitle || dateRange) && (
          <div style={{ marginTop: 16 }}>
            <Button
              type="text"
              onClick={() => {
                setSearchTitle('');
                setDateRange(null);
              }}
              style={{
                color: '#6B7280',
                fontSize: 13,
                fontWeight: 500
              }}
            >
              {t('forms.clearFilters')}
            </Button>
          </div>
        )}
      </Card>
      
        <div style={{ marginBottom: 24 }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => navigate('/forms/create')}
            size="large"
            style={{
              background: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              fontWeight: 500,
              height: 40,
              fontSize: 14,
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
            {t('forms.createForm')}
          </Button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: 15, color: '#6B7280' }}>{t('forms.loadingForms')}</div>
          </div>
        ) : !filteredForms || filteredForms.length === 0 ? (
          <Empty 
            description={
              <span style={{ fontSize: 15, color: '#6B7280' }}>
                {forms && forms.length > 0 
                  ? t('forms.noFormsMatch') 
                  : t('forms.noForms')}
              </span>
            }
            style={{ padding: '48px' }}
          />
        ) : (
          <>
            <Row gutter={[24, 24]}>
            {filteredForms.map((formItem: FormType) => {
              const createdDate = new Date(formItem.created_at);
              const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US';
              const month = createdDate.toLocaleDateString(locale, { month: 'short' });
              const day = createdDate.getDate();
              const year = createdDate.getFullYear();
              const createdTime = createdDate.toLocaleString(locale, {
                hour: '2-digit',
                minute: '2-digit'
              });
              
              return (
                <Col xs={24} sm={24} md={12} lg={8} key={formItem.id}>
                  <Card
                    size="small"
                    style={{ 
                      backgroundColor: '#fff',
                      borderRadius: 16,
                      border: 'none',
                      minHeight: '180px',
                      maxHeight: '180px',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    bodyStyle={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '20px' }}
                    hoverable
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                      <div>
                        {/* Header with title and status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                          <Text strong style={{ 
                            color: '#111827', 
                            fontSize: 18, 
                            fontWeight: 700, 
                            flex: 1,
                            lineHeight: 1.3,
                            letterSpacing: '-0.02em'
                          }}>
                            {formItem.title}
                          </Text>
                          {formItem.fields && formItem.fields.length > 0 && (
                            <Tag style={{ 
                              borderRadius: 8, 
                              fontSize: 12, 
                              fontWeight: 600,
                              color: '#6B7280', 
                              background: '#F9FAFB', 
                              border: '1px solid #E5E7EB',
                              margin: 0,
                              padding: '2px 8px',
                              height: 'auto',
                              lineHeight: '20px'
                            }}>
                              {formItem.fields.length} {formItem.fields.length === 1 ? t('forms.field') : t('forms.fields')}
                            </Tag>
                          )}
                        </div>

                        {/* Date and details section */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                          {/* Date section - left */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 50 }}>
                            <Text style={{ 
                              fontSize: 12, 
                              color: '#4F46E5', 
                              fontWeight: 500, 
                              lineHeight: 1.4,
                              marginBottom: 2,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              {month}
                            </Text>
                            <Text strong style={{ 
                              fontSize: 28, 
                              color: '#4F46E5', 
                              fontWeight: 700, 
                              lineHeight: 1,
                              fontFamily: 'system-ui, -apple-system, sans-serif'
                            }}>
                              {day}
                            </Text>
                          </div>

                          {/* Details section - middle */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <CalendarOutlined style={{ color: '#9CA3AF', fontSize: 14 }} />
                              <Text style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
                                {createdTime}
                              </Text>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Tag style={{ 
                                borderRadius: 6, 
                                fontWeight: 500, 
                                fontSize: 11, 
                                margin: 0,
                                background: '#F0F9FF',
                                border: '1px solid #BFDBFE',
                                color: '#1E40AF'
                              }}>
                                {submissionCounts[formItem.id] || 0} {submissionCounts[formItem.id] === 1 ? t('submissions.item') : t('submissions.items')}
                              </Tag>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                        <Text style={{ 
                          fontSize: 11, 
                          color: '#9CA3AF', 
                          fontWeight: 400
                        }}>
                          {year}
                        </Text>
                        <Space size={6}>
                          <Button 
                            icon={<EyeOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewForm(formItem);
                            }}
                            style={{ 
                              borderRadius: 6, 
                              fontSize: 10,
                              fontWeight: 500,
                              background: '#F9FAFB',
                              border: '1px solid #E5E7EB',
                              color: '#6B7280',
                              height: 24,
                              padding: '0 8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              transition: 'all 0.2s ease'
                            }}
                            size="small"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#F3F4F6';
                              e.currentTarget.style.borderColor = '#D1D5DB';
                              e.currentTarget.style.color = '#374151';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#F9FAFB';
                              e.currentTarget.style.borderColor = '#E5E7EB';
                              e.currentTarget.style.color = '#6B7280';
                            }}
                          >
                            {t('forms.preview')}
                          </Button>
                          <Button 
                            icon={copiedFormId === formItem.id ? <CheckCircleOutlined /> : <CopyOutlined />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLink(formItem.id);
                            }}
                            style={{ 
                              borderRadius: 6,
                              transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
                              background: copiedFormId === formItem.id ? '#10B981' : '#F9FAFB',
                              borderColor: copiedFormId === formItem.id ? '#10B981' : '#E5E7EB',
                              color: copiedFormId === formItem.id ? '#fff' : '#6B7280',
                              fontSize: 10,
                              fontWeight: 500,
                              height: 24,
                              padding: '0 8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              minWidth: 75,
                              width: 75,
                              boxSizing: 'border-box',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            size="small"
                          >
                            {copiedFormId === formItem.id ? t('forms.copied') : t('forms.copyLink')}
                          </Button>
                          {isMobile ? (
                            <>
                              <Button 
                                icon={<EditOutlined />} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(formItem);
                                }}
                                style={{ 
                                  borderRadius: 6, 
                                  fontSize: 10,
                                  fontWeight: 500,
                                  background: '#F9FAFB',
                                  border: '1px solid #E5E7EB',
                                  color: '#6B7280',
                                  height: 24,
                                  width: 24,
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease'
                                }}
                                size="small"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#F3F4F6';
                                  e.currentTarget.style.borderColor = '#D1D5DB';
                                  e.currentTarget.style.color = '#374151';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#F9FAFB';
                                  e.currentTarget.style.borderColor = '#E5E7EB';
                                  e.currentTarget.style.color = '#6B7280';
                                }}
                              />
                              <Popconfirm
                                title={t('forms.deleteConfirm')}
                                description={t('forms.deleteDescription')}
                                onConfirm={() => deleteFormMutation.mutate(formItem.id)}
                                okText={t('common.yes')}
                                cancelText={t('common.no')}
                              >
                                <Button 
                                  danger 
                                  icon={<DeleteOutlined />}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ 
                                    borderRadius: 6, 
                                    fontSize: 10,
                                    fontWeight: 500,
                                    height: 24,
                                    width: 24,
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                  }}
                                  size="small"
                                />
                              </Popconfirm>
                            </>
                          ) : (
                            <>
                              <Button 
                                icon={<EditOutlined />} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(formItem);
                                }}
                                style={{ 
                                  borderRadius: 6, 
                                  fontSize: 10,
                                  fontWeight: 500,
                                  background: '#F9FAFB',
                                  border: '1px solid #E5E7EB',
                                  color: '#6B7280',
                                  height: 24,
                                  padding: '0 8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  transition: 'all 0.2s ease'
                                }}
                                size="small"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#F3F4F6';
                                  e.currentTarget.style.borderColor = '#D1D5DB';
                                  e.currentTarget.style.color = '#374151';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#F9FAFB';
                                  e.currentTarget.style.borderColor = '#E5E7EB';
                                  e.currentTarget.style.color = '#6B7280';
                                }}
                              >
                                {t('forms.edit')}
                              </Button>
                              <Popconfirm
                                title={t('forms.deleteConfirm')}
                                description={t('forms.deleteDescription')}
                                onConfirm={() => deleteFormMutation.mutate(formItem.id)}
                                okText={t('common.yes')}
                                cancelText={t('common.no')}
                              >
                                <Button 
                                  danger 
                                  icon={<DeleteOutlined />}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ 
                                    borderRadius: 6, 
                                    fontSize: 10,
                                    fontWeight: 500,
                                    height: 24,
                                    padding: '0 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    transition: 'all 0.2s ease'
                                  }}
                                  size="small"
                                >
                                  {t('forms.delete')}
                                </Button>
                              </Popconfirm>
                            </>
                          )}
                        </Space>
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
          
          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} style={{ height: 20, marginTop: 20 }}>
            {isFetchingNextPage && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin size="small" />
                <Text style={{ marginLeft: 8, color: '#6B7280', fontSize: 14 }}>{t('forms.loadingMore')}</Text>
              </div>
            )}
          </div>
          </>
        )}

      {/* Preview Modal */}
      <Modal
        title={
          <div>
            <EyeOutlined style={{ marginRight: 8, color: '#4F46E5' }} />
            <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, color: '#1F2937' }}>{t('forms.formPreview')}</span>
          </div>
        }
        open={previewForm !== null}
        onCancel={() => setPreviewForm(null)}
        footer={null}
        width={isMobile ? '95%' : 800}
        style={{ top: isMobile ? 20 : undefined, borderRadius: 12 }}
      >
        {previewForm && (
          <div>
            <h2 style={{ marginBottom: 16, fontWeight: 600, color: '#1F2937', fontSize: 24 }}>
              {previewForm.title}
            </h2>
            {previewForm.description && (
              <p style={{ marginBottom: 32, color: '#6B7280', fontSize: 15, lineHeight: 1.6 }}>
                {previewForm.description}
              </p>
            )}
            
            <Form layout="vertical" disabled>
              <Form.Item
                label={<span style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>{t('submitForm.yourName')}</span>}
              >
                <Input placeholder={t('submitForm.enterName')} style={{ borderRadius: 8, height: 44, fontSize: 15 }} size="large" />
              </Form.Item>

              <Form.Item
                label={<span style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>{t('submitForm.yourEmail')}</span>}
              >
                <Input placeholder={t('submitForm.enterEmail')} style={{ borderRadius: 8, height: 44, fontSize: 15 }} size="large" />
              </Form.Item>

              {previewForm.fields && previewForm.fields.length > 0 && (
                <>
                  <Divider style={{ margin: '32px 0 24px 0' }} />
                  <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18, color: '#1F2937', marginBottom: 24 }}>
                    {t('submitForm.formFields')}
                  </h3>
                  {previewForm.fields
                    .sort((a, b) => a.order - b.order)
                    .map((field) => (
                      <Form.Item
                        key={field.id}
                        label={
                          <span style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>
                            {field.label}
                            {field.is_required && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
                          </span>
                        }
                      >
                        {field.field_type === 'textarea' ? (
                          <TextArea 
                            rows={4} 
                            placeholder={field.placeholder || t('submitForm.enterField', { fieldLabel: field.label.toLowerCase() })}
                            style={{ borderRadius: 8, fontSize: 15 }}
                            size="large"
                            disabled
                          />
                        ) : field.field_type === 'file' ? (
                          <Upload disabled>
                            <Button 
                              icon={<UploadOutlined />}
                              style={{ borderRadius: 8, height: 44 }}
                              size="large"
                              disabled
                            >
                              {t('submitForm.selectFile')}
                            </Button>
                          </Upload>
                        ) : field.field_type === 'number' ? (
                          <Input 
                            type="number" 
                            placeholder={field.placeholder || t('submitForm.enterField', { fieldLabel: field.label.toLowerCase() })}
                            style={{ borderRadius: 8, height: 44, fontSize: 15 }}
                            size="large"
                            disabled
                          />
                        ) : (
                          <Input 
                            placeholder={field.placeholder || t('submitForm.enterField', { fieldLabel: field.label.toLowerCase() })}
                            style={{ borderRadius: 8, height: 44, fontSize: 15 }}
                            size="large"
                            disabled
                          />
                        )}
                      </Form.Item>
                    ))}
                </>
              )}
            </Form>
          </div>
        )}
      </Modal>

      <Modal
        title={<span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>{t('forms.editForm')}</span>}
        open={editingForm !== null}
        onCancel={() => {
          setEditingForm(null);
          editForm.resetFields();
        }}
        footer={null}
        width={isMobile ? '95%' : 800}
        style={{ top: isMobile ? 20 : undefined, borderRadius: 12 }}
      >
        <Form form={editForm} onFinish={onEditFinish} layout="vertical">
          <Form.Item
            name="title"
            label={<span style={{ fontWeight: 500 }}>{t('createForm.formTitle')}</span>}
            rules={[{ required: true, message: t('forms.pleaseEnterTitle') }]}
          >
            <Input placeholder={t('createForm.formTitlePlaceholder')} style={{ borderRadius: 8 }} size="large" />
          </Form.Item>

          <Form.Item name="description" label={<span style={{ fontWeight: 500 }}>{t('createForm.formDescription')}</span>}>
            <Input.TextArea rows={3} placeholder={t('createForm.formDescriptionPlaceholder')} style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.List name="fields">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, index) => {
                  const fieldValue = editForm.getFieldValue(['fields', name]);
                  const currentOptions = editFieldOptions[index] || [];
                    
                  return (
                    <FormFieldEditor
                      key={key}
                      fieldIndex={index}
                      restField={restField}
                      name={name}
                      fieldValue={fieldValue}
                      currentOptions={currentOptions}
                      fieldOptions={editFieldOptions}
                      setFieldOptions={setEditFieldOptions}
                      form={editForm}
                      onRemove={() => {
                        remove(name);
                        // Clean up options when field is removed
                        const newOptions = { ...editFieldOptions };
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
                        setEditFieldOptions(reindexedOptions);
                      }}
                      isMobile={isMobile}
                      showDragHandle={false}
                      showQuestionNumber={false}
                      generateFieldName={generateFieldName}
                    />
                  );
                })}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    {t('forms.addField')}
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item style={{ marginTop: 24 }}>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={updateFormMutation.isPending}
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
                {t('forms.updateForm')}
              </Button>
              <Button 
                onClick={() => {
                  setEditingForm(null);
                  setEditFieldOptions({});
                  editForm.resetFields();
                }}
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
      </Modal>
    </div>
  );
};

export default Forms;


