import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, message, Popconfirm, Typography, Empty, Spin } from 'antd';
import { CheckOutlined, CloseOutlined, UserOutlined, MailOutlined, CalendarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superAdminApi, User } from '../api/superAdmin';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const SuperAdmin: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: unapprovedAdmins, isLoading, error } = useQuery({
    queryKey: ['unapprovedAdmins'],
    queryFn: superAdminApi.getUnapprovedAdmins,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const approveMutation = useMutation({
    mutationFn: superAdminApi.approveAdmin,
    onSuccess: () => {
      message.success(t('superAdmin.adminApproved') || 'Admin approved successfully');
      queryClient.invalidateQueries({ queryKey: ['unapprovedAdmins'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || t('common.error') || 'Error approving admin');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: superAdminApi.rejectAdmin,
    onSuccess: () => {
      message.success(t('superAdmin.adminRejected') || 'Admin rejected successfully');
      queryClient.invalidateQueries({ queryKey: ['unapprovedAdmins'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || t('common.error') || 'Error rejecting admin');
    },
  });

  const handleApprove = (userId: string) => {
    approveMutation.mutate(userId);
  };

  const handleReject = (userId: string) => {
    rejectMutation.mutate(userId);
  };

  const columns = [
    {
      title: t('superAdmin.name') || 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <UserOutlined style={{ color: '#9CA3AF' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: t('superAdmin.email') || 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => (
        <Space>
          <MailOutlined style={{ color: '#9CA3AF' }} />
          <Text>{text}</Text>
        </Space>
      ),
    },
    {
      title: t('superAdmin.registrationDate') || 'Registration Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => {
        const createdDate = dayjs(date);
        return (
          <Space>
            <CalendarOutlined style={{ color: '#9CA3AF' }} />
            <Text>{createdDate.format('DD MMM YYYY, HH:mm')}</Text>
          </Space>
        );
      },
    },
    {
      title: t('superAdmin.actions') || 'Actions',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space>
          <Popconfirm
            title={t('superAdmin.approveConfirm') || 'Approve this admin?'}
            description={t('superAdmin.approveDescription') || 'This will allow the admin to access the system.'}
            onConfirm={() => handleApprove(record.id)}
            okText={t('common.yes') || 'Yes'}
            cancelText={t('common.no') || 'No'}
          >
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={approveMutation.isPending}
              style={{
                background: '#10B981',
                borderColor: '#10B981',
              }}
            >
              {t('superAdmin.approve') || 'Approve'}
            </Button>
          </Popconfirm>
          <Popconfirm
            title={t('superAdmin.rejectConfirm') || 'Reject this admin?'}
            description={t('superAdmin.rejectDescription') || 'This will delete the admin registration.'}
            onConfirm={() => handleReject(record.id)}
            okText={t('common.yes') || 'Yes'}
            cancelText={t('common.no') || 'No'}
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              icon={<CloseOutlined />}
              loading={rejectMutation.isPending}
            >
              {t('superAdmin.reject') || 'Reject'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Text type="danger" style={{ fontSize: 16 }}>
          {t('superAdmin.errorLoading') || 'Error loading unapproved admins'}
        </Text>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ margin: 0, marginBottom: 8 }}>
          {t('superAdmin.title') || 'Super Admin - Pending Registrations'}
        </Title>
        <Text style={{ color: '#6B7280', fontSize: 15 }}>
          {t('superAdmin.description') || 'Review and approve admin registrations'}
        </Text>
      </div>

      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #E5E7EB',
          backgroundColor: '#fff',
        }}
        bodyStyle={{ padding: '20px' }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, fontSize: 15, color: '#6B7280' }}>
              {t('superAdmin.loading') || 'Loading...'}
            </div>
          </div>
        ) : !unapprovedAdmins || unapprovedAdmins.length === 0 ? (
          <Empty
            description={
              <span style={{ fontSize: 15, color: '#6B7280' }}>
                {t('superAdmin.noPendingRegistrations') || 'No pending admin registrations'}
              </span>
            }
            style={{ padding: '48px' }}
          />
        ) : (
          <Table
            dataSource={unapprovedAdmins}
            columns={columns}
            rowKey="id"
            pagination={false}
            scroll={{ x: isMobile ? 800 : undefined }}
          />
        )}
      </Card>
    </div>
  );
};

export default SuperAdmin;


