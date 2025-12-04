import React, { useState, useEffect, useRef } from 'react';
import { Card, Empty, Tag, Button, Space, Typography, Row, Col, Divider, Modal, Form, Input, message, Spin, DatePicker, Select, Popconfirm, Dropdown, MenuProps } from 'antd';
import { FileTextOutlined, DownloadOutlined, EyeOutlined, UserOutlined, CalendarOutlined, LoadingOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submissionsApi, FormSubmission } from '../api/submissions';
import { formsApi } from '../api/forms';
import apiClient from '../api/client';
import { Dayjs } from 'dayjs';
import { useParams, useNavigate } from 'react-router-dom';

const { Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const Submissions: React.FC = () => {
  const { t, i18n } = useTranslation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const queryClient = useQueryClient();
  const { submissionId } = useParams<{ submissionId?: string }>();
  const navigate = useNavigate();
  const [previewSubmission, setPreviewSubmission] = useState<FormSubmission | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [exportingSubmissionId, setExportingSubmissionId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Filter states
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [fieldValueSearch, setFieldValueSearch] = useState<string>('');
  const [formId, setFormId] = useState<string>('');

  // Fetch submission by ID if in URL
  const { data: submissionFromUrl, isLoading: isLoadingSubmissionFromUrl } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: async () => {
      if (!submissionId) return null;
      try {
        return await submissionsApi.getSubmissionById(submissionId);
      } catch (error) {
        message.error(t('submissions.failedToLoad'));
        navigate('/submissions');
        return null;
      }
    },
    enabled: !!submissionId,
  });

  // Sync URL submission with modal state
  useEffect(() => {
    if (submissionFromUrl && submissionId) {
      setPreviewSubmission(submissionFromUrl);
    }
  }, [submissionFromUrl, submissionId]);

  // Fetch forms for filter dropdown
  const { data: formsData } = useQuery({
    queryKey: ['forms', user.id],
    queryFn: async () => {
      const allForms: any[] = [];
      let skip = 0;
      let hasMore = true;
      while (hasMore) {
        const forms = await formsApi.getFormsByCreator(user.id, skip, 100);
        allForms.push(...forms);
        hasMore = forms.length === 100;
        skip += 100;
      }
      return allForms;
    },
    enabled: !!user.id,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['submissions', user.id, dateRange, userName, userEmail, fieldValueSearch, formId],
    queryFn: ({ pageParam = 0 }) => {
      const filters: any = {};
      if (dateRange && dateRange[0] && dateRange[1]) {
        filters.dateFrom = dateRange[0].startOf('day').toISOString();
        filters.dateTo = dateRange[1].endOf('day').toISOString();
      }
      if (userName) filters.userName = userName;
      if (userEmail) filters.userEmail = userEmail;
      if (fieldValueSearch) filters.fieldValueSearch = fieldValueSearch;
      if (formId) filters.formId = formId;
      
      return submissionsApi.getSubmissionsByAdmin(user.id, pageParam, 10, filters);
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length * 10 : undefined;
    },
    initialPageParam: 0,
  });

  // Flatten all pages into a single array
  const submissions = data?.pages.flat() || [];

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

  // Delete submission mutation
  const deleteSubmissionMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      await submissionsApi.deleteSubmission(submissionId);
    },
    onSuccess: () => {
      message.success(t('submissions.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['submissions', user.id] });
    },
    onError: () => {
      message.error(t('submissions.deleteError'));
    },
  });

  // Export submission handler
  const handleExportSubmission = async (submissionId: string, format: 'csv' | 'xlsx') => {
    setExportingSubmissionId(submissionId);
    try {
      const blob = await submissionsApi.exportSubmission(submissionId, format, i18n.language);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from blob or generate one
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const submission = submissions.find(s => s.id === submissionId);
      const formTitle = submission?.form?.title || 'submission';
      const submitterName = submission?.user?.name || 'user';
      const safeTitle = formTitle.replace(/[^a-zA-Z0-9-_ ]/g, '_').trim().replace(/\s+/g, '_');
      const safeUser = submitterName.replace(/[^a-zA-Z0-9-_ ]/g, '_').trim().replace(/\s+/g, '_');
      link.download = `${safeTitle}_${safeUser}_${timestamp}.${format}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(t('submissions.exportSuccess'));
    } catch (error: any) {
      console.error('Error exporting submission:', error);
      message.error(t('submissions.exportError'));
    } finally {
      setExportingSubmissionId(null);
    }
  };

  const isViewableFile = (contentType?: string): boolean => {
    if (!contentType) return false;
    const viewableTypes = ['application/pdf', 'image/', 'text/', 'application/json'];
    return viewableTypes.some(type => contentType.startsWith(type));
  };

  const handleDownloadFile = async (fileId: string, filename: string) => {
    setDownloadingFileId(fileId);
    try {
      const response = await apiClient.get(`/files/${fileId}/view`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      // Show success notification
      message.success({
        content: t('submissions.fileDownloaded'),
        duration: 2,
      });
      
      // Reset downloading state after a short delay
      setTimeout(() => {
        setDownloadingFileId(null);
      }, 1000);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      message.error(t('submissions.failedToDownload'));
      setDownloadingFileId(null);
    }
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
          {t('submissions.title')}
        </h1>
        <Text style={{ color: '#6B7280', fontSize: 15 }}>
          {t('submissions.subtitle')}
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
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 4 }}>
                {t('submissions.dateRange')}
              </Text>
              <RangePicker
                style={{ width: '100%', borderRadius: 8 }}
                size="large"
                value={dateRange}
                onChange={(dates) => setDateRange(dates)}
                format="YYYY-MM-DD"
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 4 }}>
                {t('submissions.userName')}
              </Text>
              <Input
                placeholder={t('submissions.searchByName')}
                prefix={<UserOutlined style={{ color: '#9CA3AF' }} />}
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={{ borderRadius: 8 }}
                size="large"
                allowClear
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 4 }}>
                {t('submissions.userEmail')}
              </Text>
              <Input
                placeholder={t('submissions.searchByEmail')}
                prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                style={{ borderRadius: 8 }}
                size="large"
                allowClear
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 4 }}>
                {t('submissions.form')}
              </Text>
              <Select
                placeholder={t('submissions.selectForm')}
                style={{ width: '100%', borderRadius: 8 }}
                size="large"
                value={formId || undefined}
                onChange={(value) => setFormId(value || '')}
                allowClear
                showSearch
                optionFilterProp="label"
                options={formsData?.map(form => ({
                  value: form.id,
                  label: form.title
                })) || []}
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 4 }}>
                {t('submissions.fieldValueSearch')}
              </Text>
              <Input
                placeholder={t('submissions.searchInFields')}
                prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
                value={fieldValueSearch}
                onChange={(e) => setFieldValueSearch(e.target.value)}
                style={{ borderRadius: 8 }}
                size="large"
                allowClear
              />
            </div>
          </Col>
        </Row>
        {(dateRange || userName || userEmail || fieldValueSearch || formId) && (
          <div style={{ marginTop: 16 }}>
            <Button
              type="text"
              onClick={() => {
                setDateRange(null);
                setUserName('');
                setUserEmail('');
                setFieldValueSearch('');
                setFormId('');
              }}
              style={{
                color: '#6B7280',
                fontSize: 13,
                fontWeight: 500
              }}
            >
              {t('submissions.clearFilters')}
            </Button>
          </div>
        )}
      </Card>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: 15, color: '#6B7280' }}>{t('submissions.loadingSubmissions')}</div>
        </div>
      ) : !submissions || submissions.length === 0 ? (
        <Empty 
          description={
            <span style={{ fontSize: 15, color: '#6B7280' }}>{t('submissions.noSubmissions')}</span>
          }
          style={{ padding: '48px' }}
        />
      ) : (
        <>
          <Row gutter={[24, 24]}>
            {submissions.map((submission: FormSubmission) => {
              const submittedDate = submission.submitted_at ? new Date(submission.submitted_at) : new Date();
              const isValidDate = !isNaN(submittedDate.getTime());
              const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-US';
              const month = isValidDate ? submittedDate.toLocaleDateString(locale, { month: 'short' }) : 'N/A';
              const day = isValidDate ? submittedDate.getDate() : 0;
              const year = isValidDate ? submittedDate.getFullYear() : 0;
              const time = isValidDate ? submittedDate.toLocaleString(locale, {
                hour: '2-digit',
                minute: '2-digit'
              }) : 'N/A';
              
              return (
                <Col xs={24} sm={24} md={12} lg={8} key={submission.id}>
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
                    onClick={() => {
                      setPreviewSubmission(submission);
                      navigate(`/submissions/${submission.id}`);
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                      <div>
                        {/* Header with title and duration */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                          <Text strong style={{ 
                            color: '#111827', 
                            fontSize: 18, 
                            fontWeight: 700, 
                            flex: 1,
                            lineHeight: 1.3,
                            letterSpacing: '-0.02em'
                          }}>
                            {submission.form?.title || 'Unknown Form'}
                          </Text>
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
                                {time}
                              </Text>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <UserOutlined style={{ color: '#9CA3AF', fontSize: 14 }} />
                                <Text style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
                                  {submission.user?.name || 'Unknown User'}
                                </Text>
                              </div>
                              {submission.user?.email && (
                                <Text style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 400 }}>
                                  {submission.user.email}
                                </Text>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* View Details button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                        <Text style={{ 
                          fontSize: 11, 
                          color: '#9CA3AF', 
                          fontWeight: 400
                        }}>
                          {year}
                        </Text>
                        <Space size={6}>
                          <Popconfirm
                            title={t('submissions.deleteConfirm')}
                            description={t('submissions.deleteDescription')}
                            onConfirm={() => deleteSubmissionMutation.mutate(submission.id)}
                            okText={t('common.yes')}
                            cancelText={t('common.no')}
                          >
                            <Button
                              icon={<DeleteOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              style={{ 
                                borderRadius: 6, 
                                fontSize: 10,
                                fontWeight: 500,
                                background: '#F9FAFB',
                                border: '1px solid #E5E7EB',
                                color: '#EF4444',
                                height: 24,
                                padding: '0 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                                transition: 'all 0.2s ease'
                              }}
                              size="small"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#FEF2F2';
                                e.currentTarget.style.borderColor = '#FCA5A5';
                                e.currentTarget.style.color = '#DC2626';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#F9FAFB';
                                e.currentTarget.style.borderColor = '#E5E7EB';
                                e.currentTarget.style.color = '#EF4444';
                              }}
                            >
                              {!isMobile && t('submissions.delete')}
                            </Button>
                          </Popconfirm>
                          <Dropdown
                            menu={{
                              items: [
                                {
                                  key: 'csv',
                                  label: t('submissions.exportAsCSV'),
                                  icon: <DownloadOutlined />,
                                  onClick: (e) => {
                                    e.domEvent.stopPropagation();
                                    handleExportSubmission(submission.id, 'csv');
                                  },
                                },
                                {
                                  key: 'xlsx',
                                  label: t('submissions.exportAsXLSX'),
                                  icon: <DownloadOutlined />,
                                  onClick: (e) => {
                                    e.domEvent.stopPropagation();
                                    handleExportSubmission(submission.id, 'xlsx');
                                  },
                                },
                              ],
                            }}
                            trigger={['click']}
                          >
                            <Button
                              icon={exportingSubmissionId === submission.id ? <LoadingOutlined spin /> : <DownloadOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              loading={exportingSubmissionId === submission.id}
                              disabled={exportingSubmissionId === submission.id}
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
                                if (exportingSubmissionId !== submission.id) {
                                  e.currentTarget.style.background = '#F3F4F6';
                                  e.currentTarget.style.borderColor = '#D1D5DB';
                                  e.currentTarget.style.color = '#374151';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (exportingSubmissionId !== submission.id) {
                                  e.currentTarget.style.background = '#F9FAFB';
                                  e.currentTarget.style.borderColor = '#E5E7EB';
                                  e.currentTarget.style.color = '#6B7280';
                                }
                              }}
                            >
                              {!isMobile && (exportingSubmissionId === submission.id ? t('submissions.downloading') : t('submissions.download'))}
                            </Button>
                          </Dropdown>
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
                <Text style={{ marginLeft: 8, color: '#6B7280', fontSize: 14 }}>{t('submissions.loadingMore')}</Text>
              </div>
            )}
          </div>
        </>
      )}

      {/* Preview Submission Modal */}
      <Modal
        title={
          <div>
            <EyeOutlined style={{ marginRight: 8, color: '#4F46E5' }} />
            <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, color: '#1F2937' }}>{t('submissions.submissionDetails')}</span>
          </div>
        }
        open={previewSubmission !== null}
        onCancel={() => {
          setPreviewSubmission(null);
          navigate('/submissions');
        }}
        footer={null}
        width={isMobile ? '95%' : 800}
        style={{ top: isMobile ? 20 : undefined, borderRadius: 12 }}
      >
        {previewSubmission && (
          <div>
            <h2 style={{ marginBottom: 8, fontWeight: 600, color: '#1F2937', fontSize: 24 }}>
              {previewSubmission.form?.title || 'Unknown Form'}
            </h2>
            <div style={{ marginBottom: 24 }}>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>
                {t('submissions.submittedBy')} <strong>{previewSubmission.user?.name || 'Unknown User'}</strong>
                {previewSubmission.user?.email && ` (${previewSubmission.user.email})`}
              </Text>
            </div>
            <div style={{ marginBottom: 24 }}>
              <CalendarOutlined style={{ color: '#9CA3AF', marginRight: 8 }} />
              <Text style={{ fontSize: 13, color: '#6B7280' }}>
                {(() => {
                  const date = previewSubmission.submitted_at ? new Date(previewSubmission.submitted_at) : new Date();
                  const isValid = !isNaN(date.getTime());
                  return isValid ? date.toLocaleString(i18n.language === 'uk' ? 'uk-UA' : 'en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A';
                })()}
              </Text>
            </div>
            
            <Form layout="vertical">
              {previewSubmission.form?.fields && previewSubmission.form.fields.length > 0 && (
                <>
                  <Divider style={{ margin: '24px 0' }} />
                  <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18, color: '#1F2937', marginBottom: 24 }}>
                    {t('submissions.formFields')}
                  </h3>
                  {previewSubmission.form.fields
                    .sort((a, b) => a.order - b.order)
                    .map((field) => {
                      const fieldValue = previewSubmission.field_values.find(fv => fv.field_id === field.id);
                      console.log('Field:', field.label, 'Field ID:', field.id, 'Field Value:', fieldValue);
                      console.log('All field_values:', previewSubmission.field_values);
                      return (
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
                              value={fieldValue?.value || ''}
                              style={{ borderRadius: 8, fontSize: 15 }}
                              size="large"
                              readOnly
                            />
                          ) : field.field_type === 'files' ? (
                            <div>
                              {previewSubmission.files
                                .filter(f => f.field_id && f.field_id === field.id)
                                .map((file) => (
                                  <div 
                                    key={file.id} 
                                    style={{ 
                                      marginBottom: 8, 
                                      display: 'flex', 
                                      flexDirection: isMobile ? 'column' : 'row',
                                      justifyContent: 'space-between', 
                                      alignItems: isMobile ? 'flex-start' : 'center', 
                                      padding: '12px', 
                                      background: '#F9FAFB', 
                                      borderRadius: 8,
                                      gap: isMobile ? 12 : 0
                                    }}
                                  >
                                    <Space 
                                      size="small" 
                                      style={{ 
                                        flex: 1, 
                                        minWidth: 0,
                                        flexWrap: isMobile ? 'wrap' : 'nowrap'
                                      }}
                                    >
                                      <FileTextOutlined style={{ color: '#4F46E5', flexShrink: 0 }} />
                                      <Text 
                                        style={{ 
                                          fontSize: 13, 
                                          color: '#1F2937',
                                          wordBreak: 'break-word',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          display: 'block',
                                          maxWidth: '100%'
                                        }}
                                        ellipsis={{ tooltip: file.original_filename }}
                                      >
                                        {file.original_filename}
                                      </Text>
                                      <Tag style={{ fontSize: '11px', borderRadius: 4, background: '#F3F4F6', border: 'none', color: '#6B7280', flexShrink: 0 }}>
                                        {(file.file_size / 1024).toFixed(1)} KB
                                      </Tag>
                                    </Space>
                                    <Space 
                                      size="small" 
                                      style={{ 
                                        flexShrink: 0,
                                        flexWrap: isMobile ? 'wrap' : 'nowrap'
                                      }}
                                    >
                                      {isViewableFile(file.content_type) && (
                                        <Button
                                          type="link"
                                          size="small"
                                          icon={<EyeOutlined />}
                                          onClick={async () => {
                                            try {
                                              const response = await apiClient.get(`/files/${file.id}/view`, {
                                                responseType: 'blob',
                                              });
                                              const blob = new Blob([response.data], { type: file.content_type });
                                              const url = window.URL.createObjectURL(blob);
                                              window.open(url, '_blank');
                                            } catch (error: any) {
                                              console.error('Error viewing file:', error);
                                              message.error(t('submissions.failedToView'));
                                            }
                                          }}
                                          style={{ 
                                            padding: 0, 
                                            fontSize: 12, 
                                            color: '#4F46E5', 
                                            fontWeight: 500,
                                            pointerEvents: 'auto',
                                            cursor: 'pointer'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.color = '#6366F1';
                                            e.currentTarget.style.opacity = '1';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.color = '#4F46E5';
                                            e.currentTarget.style.opacity = '1';
                                          }}
                                        >
                                          {t('submissions.view')}
                                        </Button>
                                      )}
                                      <Button
                                        type="link"
                                        size="small"
                                        icon={downloadingFileId === file.id ? <LoadingOutlined spin /> : <DownloadOutlined />}
                                        onClick={() => handleDownloadFile(file.id, file.original_filename)}
                                        loading={downloadingFileId === file.id}
                                        disabled={downloadingFileId === file.id}
                                        style={{ 
                                          padding: 0, 
                                          fontSize: 12, 
                                          color: downloadingFileId === file.id ? '#10B981' : '#6B7280', 
                                          fontWeight: 500,
                                          pointerEvents: downloadingFileId === file.id ? 'none' : 'auto',
                                          cursor: downloadingFileId === file.id ? 'wait' : 'pointer',
                                          transition: 'color 0.3s ease'
                                        }}
                                      >
                                        {downloadingFileId === file.id ? t('submissions.downloading') : t('submissions.download')}
                                      </Button>
                                    </Space>
                                  </div>
                                ))}
                            </div>
                          ) : field.field_type === 'select' || field.field_type === 'multiselect' ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {fieldValue?.value ? (
                                (() => {
                                  try {
                                    // Try to parse as JSON (for multiselect)
                                    const parsed = JSON.parse(fieldValue.value);
                                    const values = Array.isArray(parsed) ? parsed : [fieldValue.value];
                                    return values.map((val: string, idx: number) => (
                                      <Tag
                                        key={idx}
                                        style={{
                                          borderRadius: 6,
                                          padding: '4px 12px',
                                          fontSize: 13,
                                          fontWeight: 500,
                                          background: '#EEF2FF',
                                          border: '1px solid #C7D2FE',
                                          color: '#4338CA',
                                          margin: 0
                                        }}
                                      >
                                        {val}
                                      </Tag>
                                    ));
                                  } catch {
                                    // If not JSON, treat as single value
                                    return (
                                      <Tag
                                        style={{
                                          borderRadius: 6,
                                          padding: '4px 12px',
                                          fontSize: 13,
                                          fontWeight: 500,
                                          background: '#EEF2FF',
                                          border: '1px solid #C7D2FE',
                                          color: '#4338CA',
                                          margin: 0
                                        }}
                                      >
                                        {fieldValue.value}
                                      </Tag>
                                    );
                                  }
                                })()
                              ) : (
                                <Text style={{ color: '#9CA3AF', fontSize: 13 }}>-</Text>
                              )}
                            </div>
                          ) : field.field_type === 'signature' ? (
                            <div style={{
                              border: '2px solid #E5E7EB',
                              borderRadius: 8,
                              padding: 8,
                              display: 'inline-block',
                              backgroundColor: '#FAFBFC',
                            }}>
                              {fieldValue?.value ? (
                                <img 
                                  src={fieldValue.value} 
                                  alt="Signature" 
                                  style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    display: 'block',
                                    borderRadius: 4,
                                  }}
                                />
                              ) : (
                                <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No signature</Text>
                              )}
                            </div>
                          ) : (
                            <Input 
                              value={fieldValue?.value || ''}
                              style={{ borderRadius: 8, height: 44, fontSize: 15 }} 
                              size="large" 
                              readOnly
                            />
                          )}
                        </Form.Item>
                      );
                    })}
                </>
              )}
            </Form>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Submissions;
