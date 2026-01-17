import React from 'react';
import { Modal, Button, Space, Alert, Typography } from 'antd';
import { SyncOutlined, CloseOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ConflictModalProps {
  open: boolean;
  onRefresh: () => void;
  onCancel: () => void;
}

/**
 * Модальное окно конфликта версий (optimistic concurrency)
 * Показывается когда другой пользователь изменил запись во время редактирования
 */
const ConflictModal: React.FC<ConflictModalProps> = ({
  open,
  onRefresh,
  onCancel,
}) => {
  const theme = localStorage.getItem('tenderHub_theme') || 'light';

  return (
    <Modal
      title="Конфликт редактирования"
      open={open}
      onCancel={onCancel}
      footer={null}
      rootClassName={theme === 'dark' ? 'dark-modal' : ''}
      width={480}
    >
      <Alert
        type="warning"
        showIcon
        message="Запись была изменена другим пользователем"
        description={
          <Text type="secondary">
            Пока вы редактировали эту строку, её изменил другой пользователь.
            Ваши изменения не были сохранены, чтобы избежать потери данных.
          </Text>
        }
        style={{ marginBottom: 24 }}
      />

      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button icon={<CloseOutlined />} onClick={onCancel}>
          Отмена
        </Button>
        <Button type="primary" icon={<SyncOutlined />} onClick={onRefresh}>
          Обновить строку
        </Button>
      </Space>
    </Modal>
  );
};

export default ConflictModal;
