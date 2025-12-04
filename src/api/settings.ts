import client from './client';

interface NotificationSettings {
  telegram_chat_id: string | null;
  telegram_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  notification_preferences: Record<string, any> | null;
}

interface NotificationSettingsUpdate {
  telegram_chat_id?: string;
  telegram_notifications_enabled?: boolean;
  email_notifications_enabled?: boolean;
  notification_preferences?: Record<string, any>;
}

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id;
  
  if (!userId) {
    throw new Error('User not logged in');
  }

  const response = await client.get(`/users/${userId}/notification-settings`);
  return response.data;
};

export const updateNotificationSettings = async (
  settings: NotificationSettingsUpdate
): Promise<NotificationSettings> => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user.id;
  
  if (!userId) {
    throw new Error('User not logged in');
  }

  const response = await client.put(`/users/${userId}/notification-settings`, settings);
  return response.data;
};
