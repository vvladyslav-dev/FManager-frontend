import React, { useState, useEffect } from 'react';
import { Card, Switch, Input, Button, message, Space, Typography, Divider } from 'antd';
import { BellOutlined, CopyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { getNotificationSettings, updateNotificationSettings } from '../api/settings';

const { Title, Text, Paragraph } = Typography;

interface NotificationSettings {
  telegram_chat_id: string | null;
  telegram_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  notification_preferences: Record<string, any> | null;
}

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    telegram_chat_id: null,
    telegram_notifications_enabled: false,
    email_notifications_enabled: false,
    notification_preferences: null,
  });
  const [chatIdInput, setChatIdInput] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getNotificationSettings();
      setSettings(data);
      if (data.telegram_chat_id) {
        setChatIdInput(data.telegram_chat_id);
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || t('settings.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramToggle = async (enabled: boolean) => {
    if (enabled && !settings.telegram_chat_id) {
      message.warning(t('settings.telegramPleaseSetChatId'));
      return;
    }

    try {
      setSaving(true);
      const updatedSettings = await updateNotificationSettings({
        telegram_notifications_enabled: enabled,
      });
      setSettings(updatedSettings);
      message.success(
        enabled ? t('settings.telegramEnabled') : t('settings.telegramDisabled')
      );
    } catch (error: any) {
      message.error(error.response?.data?.detail || t('settings.failedToUpdate'));
    } finally {
      setSaving(false);
    }
  };

  const handleEmailToggle = async (enabled: boolean) => {
    try {
      setSaving(true);
      const updatedSettings = await updateNotificationSettings({
        email_notifications_enabled: enabled,
      });
      setSettings(updatedSettings);
      message.success(enabled ? t('settings.emailEnabled') : t('settings.emailDisabled'));
    } catch (error: any) {
      message.error(error.response?.data?.detail || t('settings.failedToUpdate'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChatId = async () => {
    if (!chatIdInput.trim()) {
      message.warning(t('settings.enterChatId'));
      return;
    }

    try {
      setSaving(true);
      const updatedSettings = await updateNotificationSettings({
        telegram_chat_id: chatIdInput.trim(),
      });
      setSettings(updatedSettings);
      message.success(t('settings.chatIdSaved'));
    } catch (error: any) {
      message.error(error.response?.data?.detail || t('settings.failedToSaveChatId'));
    } finally {
      setSaving(false);
    }
  };

  const copyBotLink = () => {
    const botLink = 'https://t.me/FManager_notification_bot';
    navigator.clipboard.writeText(botLink);
    message.success(t('settings.botLinkCopied'));
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2}>
        <BellOutlined /> {t('settings.title')}
      </Title>

      <Card loading={loading} style={{ marginTop: '24px' }}>
        <Title level={4}>{t('settings.telegramTitle')}</Title>
        <Paragraph type="secondary">
          {t('settings.telegramDescription')}
        </Paragraph>

        <Divider />

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Step 1: Open Telegram Bot */}
          <div>
            <Text strong>{t('settings.step1Title')}</Text>
            <div style={{ marginTop: '8px' }}>
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={copyBotLink}
              >
                {t('settings.copyBotLink')}
              </Button>
              <Paragraph type="secondary" style={{ marginTop: '8px' }}>
                {t('settings.step1Description')}
              </Paragraph>
            </div>
          </div>

          {/* Step 2: Get Chat ID */}
          <div>
            <Text strong>{t('settings.step2Title')}</Text>
            <Paragraph type="secondary" style={{ marginTop: '8px' }}>
              {t('settings.step2Description')}
            </Paragraph>
          </div>

          {/* Step 3: Enter Chat ID */}
          <div>
            <Text strong>{t('settings.step3Title')}</Text>
            <Space.Compact style={{ width: '100%', marginTop: '8px' }}>
              <Input
                placeholder={t('settings.chatIdPlaceholder')}
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                disabled={saving}
              />
              <Button
                type="primary"
                onClick={handleSaveChatId}
                loading={saving}
                disabled={!chatIdInput.trim()}
              >
                {t('common.save')}
              </Button>
            </Space.Compact>
            {settings.telegram_chat_id && (
              <div style={{ marginTop: '8px' }}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> {t('settings.connected')}
              </div>
            )}
          </div>

          {/* Step 4: Enable Notifications */}
          <div>
            <Space>
              <Switch
                checked={settings.telegram_notifications_enabled}
                onChange={handleTelegramToggle}
                loading={saving}
                disabled={!settings.telegram_chat_id}
              />
              <Text strong>{t('settings.enableTelegram')}</Text>
            </Space>
            {!settings.telegram_chat_id && (
              <Paragraph type="secondary" style={{ marginTop: '8px' }}>
                {t('settings.telegramPleaseSetChatId')}
              </Paragraph>
            )}
          </div>
        </Space>
      </Card>

      {/* Email Notifications (Future) */}
      <Card style={{ marginTop: '24px' }}>
        <Title level={4}>{t('settings.emailTitle')}</Title>
        <Paragraph type="secondary">
          {t('settings.emailDescription')}
        </Paragraph>
        <Space>
          <Switch
            checked={settings.email_notifications_enabled}
            onChange={handleEmailToggle}
            loading={saving}
          />
          <Text strong>{t('settings.enableEmail')}</Text>
        </Space>
        <Paragraph type="secondary" style={{ marginTop: '8px' }}>
          {t('settings.emailComingSoon')}
        </Paragraph>
      </Card>
    </div>
  );
};

export default Settings;
