import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Space, Typography, Avatar, Dropdown, Drawer } from 'antd';
import { FormOutlined, FileTextOutlined, LogoutOutlined, UserOutlined, GlobalOutlined, MenuOutlined, SafetyOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MenuProps } from 'antd';
import { authApi } from '../api/auth';

const { Header, Content } = Layout;
const { Text } = Typography;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    authApi.logout();
    navigate('/login');
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const languageMenuItems: MenuProps['items'] = [
    {
      key: 'en',
      label: 'English',
      onClick: () => handleLanguageChange('en'),
    },
    {
      key: 'uk',
      label: 'Українська',
      onClick: () => handleLanguageChange('uk'),
    },
  ];

  const menuItems = [
    {
      key: '/forms',
      icon: <FormOutlined />,
      label: t('common.forms'),
    },
    {
      key: '/submissions',
      icon: <FileTextOutlined />,
      label: t('common.submissions'),
    },
    ...(user.is_super_admin ? [{
      key: '/super-admin',
      icon: <SafetyOutlined />,
      label: t('common.superAdmin') || 'Super Admin',
    }] : []),
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#FAFBFC' }}>
      <Header 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          background: '#FFFFFF',
          padding: isMobile ? '0 16px' : '0 32px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          borderBottom: '1px solid #E5E7EB',
          height: isMobile ? 64 : 72
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 16 : 40 }}>
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
              style={{ marginRight: 8 }}
            />
          )}
          <div style={{ 
            fontSize: isMobile ? 18 : 20, 
            fontWeight: 600, 
            color: '#1F2937',
            letterSpacing: '-0.02em'
          }}>
            FManager
          </div>
          {!isMobile && (
            <Menu
              mode="horizontal"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
              style={{ 
                flex: 1, 
                minWidth: 0,
                background: 'transparent',
                borderBottom: 'none',
                fontSize: 15,
                fontWeight: 500
              }}
            />
          )}
        </div>
        <Space size={isMobile ? 8 : 16} wrap={false}>
          {!isMobile && (
            <Space size={12}>
              <Avatar icon={<UserOutlined />} style={{ background: '#F3F4F6', color: '#6B7280' }} />
              <Text style={{ color: '#1F2937', fontWeight: 500, fontSize: 14 }}>{user.name}</Text>
            </Space>
          )}
          {isMobile && (
            <Avatar icon={<UserOutlined />} style={{ background: '#F3F4F6', color: '#6B7280' }} />
          )}
          <Dropdown menu={{ items: languageMenuItems }} placement="bottomRight">
            <Button
              type="text"
              icon={<GlobalOutlined />}
              style={{
                color: '#6B7280',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: isMobile ? '4px 8px' : undefined
              }}
            >
              {!isMobile && (i18n.language === 'uk' ? 'УКР' : 'ENG')}
            </Button>
          </Dropdown>
          {!isMobile && (
            <Button 
              type="text"
              danger 
              icon={<LogoutOutlined />} 
              onClick={handleLogout}
              style={{
                color: '#EF4444',
                fontWeight: 500
              }}
            >
              {t('common.logout')}
            </Button>
          )}
        </Space>
      </Header>
      <Drawer
        title={null}
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
        extra={
          <Button 
            type="text"
            danger 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
            style={{
              color: '#EF4444',
              fontWeight: 500
            }}
          >
            {t('common.logout')}
          </Button>
        }
        footer={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <GlobalOutlined style={{ color: '#6B7280', fontSize: 18 }} />
            <Dropdown menu={{ items: languageMenuItems }} placement="topLeft">
              <Button
                type="text"
                style={{ 
                  color: '#1F2937', 
                  fontWeight: 500,
                  padding: 0,
                  height: 'auto'
                }}
              >
                {i18n.language === 'uk' ? 'Українська' : 'English'}
              </Button>
            </Dropdown>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar icon={<UserOutlined />} style={{ background: '#F3F4F6', color: '#6B7280' }} />
            <Text style={{ color: '#1F2937', fontWeight: 500, fontSize: 16 }}>{user.name}</Text>
          </div>

          {/* Navigation menu */}
          <Menu
            mode="vertical"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={({ key }) => {
              navigate(key);
              setMobileMenuOpen(false);
            }}
            style={{ border: 'none', background: 'transparent' }}
          />
        </div>
      </Drawer>
      <Content style={{ 
        padding: isMobile ? '16px' : '32px', 
        minHeight: `calc(100vh - ${isMobile ? 64 : 72}px)` 
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
};

export default AppLayout;

