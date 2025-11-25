import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, FormOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authApi, AuthResponse } from '../api/auth';
import { useNavigate, Link } from 'react-router-dom';

const { Text, Title } = Typography;

const Register: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data: AuthResponse) => {
      // If admin is not approved, don't login automatically
      if (data.user.is_admin && !data.user.is_approved) {
        message.warning(t('register.adminPendingApproval') || 'Your registration is pending approval by a super administrator. You will be able to login after approval.');
        navigate('/login');
        return;
      }
      
      // Regular users can login immediately
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        message.success(t('register.registerSuccessful'));
        navigate('/');
      } else {
        message.warning(t('register.adminPendingApproval') || 'Your registration is pending approval by a super administrator.');
        navigate('/login');
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.detail || t('register.registrationError'));
    },
  });

  const onFinish = (values: { email: string; password: string; name: string }) => {
    // All registrations are admin accounts
    registerMutation.mutate({ ...values, is_admin: true });
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      background: '#FAFBFC',
      padding: isMobile ? '16px' : '24px'
    }}>
      <Card 
        style={{ 
          width: '100%',
          maxWidth: 440,
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #E5E7EB'
        }}
        bodyStyle={{ padding: isMobile ? '32px 24px' : '48px' }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center', marginBottom: isMobile ? 32 : 40 }}>
          <div style={{ 
            width: isMobile ? 48 : 56, 
            height: isMobile ? 48 : 56, 
            borderRadius: 12, 
            background: '#4F46E5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto'
          }}>
            <FormOutlined style={{ fontSize: isMobile ? 24 : 28, color: '#fff' }} />
          </div>
          <Title level={2} style={{ margin: 0, fontWeight: 600, color: '#1F2937', fontSize: isMobile ? 24 : 28 }}>{t('register.title')}</Title>
          <Text style={{ color: '#6B7280', fontSize: isMobile ? 14 : 15 }}>{t('register.subtitle')}</Text>
        </Space>

        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="name"
            label={<Text style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>{t('common.name')}</Text>}
            rules={[{ required: true, message: t('register.pleaseEnterName') }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#9CA3AF' }} />} 
              placeholder={t('register.namePlaceholder')}
              style={{ borderRadius: 8, height: 44, fontSize: 15 }}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label={<Text style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>{t('common.email')}</Text>}
            rules={[{ required: true, message: t('register.pleaseEnterEmail'), type: 'email' }]}
          >
            <Input 
              prefix={<MailOutlined style={{ color: '#9CA3AF' }} />} 
              placeholder={t('register.emailPlaceholder')}
              style={{ borderRadius: 8, height: 44, fontSize: 15 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<Text style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>{t('common.password')}</Text>}
            rules={[{ required: true, message: t('register.pleaseEnterPassword'), min: 6 }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#9CA3AF' }} />} 
              placeholder={t('register.passwordPlaceholder')}
              style={{ borderRadius: 8, height: 44, fontSize: 15 }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 32 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={registerMutation.isPending}
              size="large"
              style={{
                borderRadius: 8,
                height: 44,
                background: '#4F46E5',
                border: 'none',
                fontWeight: 500,
                fontSize: 15,
                boxShadow: '0 1px 2px rgba(79, 70, 229, 0.2)'
              }}
            >
              {t('register.registerButton')}
            </Button>
          </Form.Item>
          
          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Text style={{ color: '#6B7280', fontSize: 14 }}>
              {t('register.haveAccount')}{' '}
              <Link to="/login" style={{ fontWeight: 500, color: '#4F46E5' }}>
                {t('register.loginLink')}
              </Link>
            </Text>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Register;

