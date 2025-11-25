import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography, Space, Alert } from 'antd';
import { UserOutlined, LockOutlined, FormOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authApi, AuthResponse } from '../api/auth';
import { useNavigate, Link } from 'react-router-dom';

const { Text, Title } = Typography;

const Login: React.FC = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data: AuthResponse) => {
      setErrorMessage(null);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      message.success(t('login.loginSuccessful'));
      navigate('/');
    },
    onError: (error: any) => {
      console.error('Login error:', error);
      let errorMsg = t('login.invalidCredentials');
      
      if (error.response) {
        // Server responded with error
        errorMsg = error.response.data?.detail || error.response.data?.message || errorMsg;
      } else if (error.request) {
        // Request was made but no response received
        errorMsg = t('login.networkError');
      } else {
        // Something else happened
        errorMsg = error.message || errorMsg;
      }
      
      setErrorMessage(errorMsg);
      message.error(errorMsg, 5);
      
      // Clear password field on error
      form.setFieldsValue({ password: '' });
    },
  });

  const onFinish = (values: { email: string; password: string }) => {
    loginMutation.mutate(values);
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
          <Title level={2} style={{ margin: 0, fontWeight: 600, color: '#1F2937', fontSize: isMobile ? 24 : 28 }}>{t('login.title')}</Title>
          <Text style={{ color: '#6B7280', fontSize: isMobile ? 14 : 15 }}>{t('login.subtitle')}</Text>
        </Space>

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          {errorMessage && (
            <Alert
              message={errorMessage}
              type="error"
              showIcon
              closable
              onClose={() => setErrorMessage(null)}
              style={{ 
                marginBottom: 24, 
                borderRadius: 8,
                background: '#FEF2F2',
                borderColor: '#FECACA',
                color: '#991B1B'
              }}
            />
          )}
          
          <Form.Item
            name="email"
            label={<Text style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>{t('common.email')}</Text>}
            rules={[{ required: true, message: t('login.pleaseEnterEmail'), type: 'email' }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#9CA3AF' }} />} 
              placeholder={t('login.emailPlaceholder')}
              style={{ borderRadius: 8, height: 44, fontSize: 15 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<Text style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>{t('common.password')}</Text>}
            rules={[{ required: true, message: t('login.pleaseEnterPassword') }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#9CA3AF' }} />} 
              placeholder={t('login.passwordPlaceholder')}
              style={{ borderRadius: 8, height: 44, fontSize: 15 }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 32 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loginMutation.isPending}
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
              {t('login.loginButton')}
            </Button>
          </Form.Item>
          
          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Text style={{ color: '#6B7280', fontSize: 14 }}>
              {t('login.noAccount')}{' '}
              <Link to="/register" style={{ fontWeight: 500, color: '#4F46E5' }}>
                {t('login.registerLink')}
              </Link>
            </Text>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;

