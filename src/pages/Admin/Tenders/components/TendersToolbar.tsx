import React from 'react';
import { Input, Space, Button, DatePicker } from 'antd';
import { SearchOutlined, ExportOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;

interface TendersToolbarProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  onExportAll: () => void;
  onCreateNew: () => void;
  onRefresh?: () => void;
}

export const TendersToolbar: React.FC<TendersToolbarProps> = ({
  searchText,
  onSearchChange,
  onExportAll,
  onCreateNew,
  onRefresh,
}) => {
  return (
    <div style={{
      marginBottom: 16,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 16
    }}>
      <Input
        placeholder="Поиск по названию, номеру, клиенту или версии..."
        prefix={<SearchOutlined />}
        style={{ flex: 1, maxWidth: 600 }}
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <Space>
        <RangePicker
          placeholder={['Дата от', 'Дата до']}
          style={{ width: 260 }}
        />

        {onRefresh && (
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
          >
            Обновить
          </Button>
        )}

        <Button
          icon={<ExportOutlined />}
          onClick={onExportAll}
        >
          Экспорт всех тендеров
        </Button>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreateNew}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderColor: '#059669',
          }}
        >
          Новый тендер
        </Button>
      </Space>
    </div>
  );
};
