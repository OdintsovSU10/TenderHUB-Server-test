import React from 'react';
import { Upload, Alert, List, Typography } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

const { Text } = Typography;
const { Dragger } = Upload;

interface UploadStepProps {
  fileList: UploadFile[];
  onFileUpload: (file: File) => boolean;
  onRemove: () => void;
  uploading: boolean;
  tenderName: string;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  fileList,
  onFileUpload,
  onRemove,
  uploading,
  tenderName,
}) => {
  return (
    <div style={{ width: '100%' }}>
      {/* Информация о тендере */}
      <Alert
        message={<Text strong>Тендер: {tenderName}</Text>}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* Инструкция по формату файла */}
      <Alert
        message="Формат Excel файла"
        description={
          <List size="small" style={{ marginTop: 8 }}>
            <List.Item>
              <Text>1-й столбец: <Text code>Номер раздела</Text> (item_no)</Text>
            </List.Item>
            <List.Item>
              <Text>2-й столбец: <Text code>Уровень иерархии</Text> (число, например: 0, 1, 2)</Text>
            </List.Item>
            <List.Item>
              <Text>3-й столбец: <Text code>Название работы</Text> (обязательное)</Text>
            </List.Item>
            <List.Item>
              <Text>4-й столбец: <Text code>Единица измерения</Text> (код единицы)</Text>
            </List.Item>
            <List.Item>
              <Text>5-й столбец: <Text code>Объем</Text> (число)</Text>
            </List.Item>
            <List.Item>
              <Text>6-й столбец: <Text code>Примечание</Text> (текст)</Text>
            </List.Item>
          </List>
        }
        type="warning"
        style={{ marginBottom: 16 }}
      />

      {/* Загрузчик файла */}
      <Dragger
        fileList={fileList}
        beforeUpload={onFileUpload}
        onRemove={onRemove}
        accept=".xlsx,.xls"
        maxCount={1}
        disabled={uploading}
      >
        <p className="ant-upload-drag-icon">
          <FileExcelOutlined style={{ color: '#10b981' }} />
        </p>
        <p className="ant-upload-text">Нажмите или перетащите Excel файл</p>
        <p className="ant-upload-hint">
          Поддерживаются форматы: .xlsx, .xls
        </p>
      </Dragger>
    </div>
  );
};
