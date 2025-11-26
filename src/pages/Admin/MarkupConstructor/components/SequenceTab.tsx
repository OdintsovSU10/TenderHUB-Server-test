import React from 'react';
import { Typography } from 'antd';
import { TabKey } from '../types';

const { Text } = Typography;

interface SequenceTabProps {
  tabKey: TabKey;
}

export const SequenceTab: React.FC<SequenceTabProps> = ({
  tabKey,
}) => {
  return (
    <div style={{ padding: '8px 0' }}>
      <Text>Sequence Tab для {tabKey} - в процессе рефакторинга</Text>
      {/* Полная реализация будет добавлена в следующем шаге */}
    </div>
  );
};
