import React, { useState } from 'react';
import { Card, Input, Button, Upload, message, Space, Typography } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { UploadProps } from 'antd';
import * as userApiModule from '../api/user';

const userApi = userApiModule.userApi;

const { Title, Paragraph } = Typography;

const UserSettings: React.FC = () => {
  const { t } = useTranslation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [email, setEmail] = useState<string>(user.email || '');
  const [savingEmail, setSavingEmail] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);

  const handleSaveEmail = async () => {
    if (!email.trim()) {
      message.warning(t('settings.enterEmail') || 'Please enter email');
      return;
    }
    try {
      setSavingEmail(true);
      const updated = await userApi.updateEmail(user.id, email.trim());
      localStorage.setItem('user', JSON.stringify({ ...user, email: updated.email }));
      message.success(t('settings.emailUpdated') || 'Email updated');
    } catch (err: any) {
      message.error(err.response?.data?.detail || (t('settings.failedToUpdate') as string));
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      message.warning(t('settings.enterPasswords') || 'Please enter both passwords');
      return;
    }
    try {
      setSavingPassword(true);
      await userApi.changePassword({ old_password: oldPassword, new_password: newPassword });
      setOldPassword('');
      setNewPassword('');
      message.success(t('settings.passwordChanged') || 'Password changed');
    } catch (err: any) {
      message.error(err.response?.data?.detail || (t('settings.failedToUpdate') as string));
    } finally {
      setSavingPassword(false);
    }
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      setAvatarFile(file);
      setFileList([file]);
      return false; // prevent auto upload
    },
    onRemove: () => {
      setAvatarFile(null);
      setFileList([]);
    },
    fileList: fileList,
    maxCount: 1,
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      message.warning(t('settings.chooseAvatar') || 'Please choose an avatar');
      return;
    }
    try {
      setUploadingAvatar(true);
      const res = await userApi.uploadAvatar(user.id, avatarFile);
      const updatedUser = { ...user, avatar_url: res.avatar_url };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      // Trigger custom event for AppLayout to update
      window.dispatchEvent(new Event('userUpdated'));
      message.success(t('settings.avatarUpdated') || 'Avatar updated');
      setAvatarFile(null);
      setFileList([]);
    } catch (err: any) {
      message.error(err.response?.data?.detail || (t('settings.failedToUpdate') as string));
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      <Title level={2}><UserOutlined /> {t('settings.userSettingsTitle') || 'User Settings'}</Title>

      <Card style={{ marginTop: 24 }}>
        <Title level={4}><MailOutlined /> {t('settings.changeEmailTitle') || 'Change Email'}</Title>
        <Space.Compact style={{ width: '100%', marginTop: 8 }}>
          <Input
            placeholder={t('settings.emailPlaceholder') || 'Enter new email'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="primary" onClick={handleSaveEmail} loading={savingEmail}>
            {t('common.save')}
          </Button>
        </Space.Compact>
      </Card>

      <Card style={{ marginTop: 24 }}>
        <Title level={4}><LockOutlined /> {t('settings.changePasswordTitle') || 'Change Password'}</Title>
        <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
          <Input.Password
            placeholder={t('settings.oldPasswordPlaceholder') || 'Enter current password'}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          <Input.Password
            placeholder={t('settings.newPasswordPlaceholder') || 'Enter new password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Button type="primary" onClick={handleChangePassword} loading={savingPassword}>
            {t('settings.changePasswordButton') || 'Change Password'}
          </Button>
        </Space>
      </Card>

      <Card style={{ marginTop: 24 }}>
        <Title level={4}><UploadOutlined /> {t('settings.changeAvatarTitle') || 'Change Avatar'}</Title>
        <Space style={{ marginTop: 8 }}>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>{t('settings.chooseFile') || 'Choose file'}</Button>
          </Upload>
          <Button type="primary" onClick={handleUploadAvatar} loading={uploadingAvatar}>
            {t('settings.uploadButton') || 'Upload'}</Button>
        </Space>
        <Paragraph type="secondary" style={{ marginTop: 8 }}>
          {t('settings.avatarNote') || 'Max 2MB, JPG/PNG'}
        </Paragraph>
      </Card>
    </div>
  );
};

export default UserSettings;
