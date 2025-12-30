import React from 'react';
import {
  Alert,
  Space,
  List,
  Typography,
  Progress
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ValidationResult } from '../hooks/useBoqUpload';

const { Text } = Typography;

interface PreviewStepProps {
  validationResult: ValidationResult | null;
  parsedDataCount: number;
  uploadProgress: number;
  uploading: boolean;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
  validationResult,
  parsedDataCount,
  uploadProgress,
  uploading,
}) => {
  if (!validationResult) {
    return null;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {validationResult.isValid && validationResult.unknownUnits.length === 0 && (
        <Alert
          message={
            <Space>
              <CheckCircleOutlined />
              <Text>Данные валидны. Готово к загрузке: {parsedDataCount} позиций</Text>
            </Space>
          }
          type="success"
          showIcon
        />
      )}

      {validationResult.errors.length > 0 && (
        <Alert
          message={<Text strong>Ошибки ({validationResult.errors.length})</Text>}
          description={
            <List
              size="small"
              dataSource={validationResult.errors.slice(0, 5)}
              renderItem={(error) => (
                <List.Item>
                  <CloseCircleOutlined style={{ color: '#f44336', marginRight: 8 }} />
                  <Text type="danger">{error}</Text>
                </List.Item>
              )}
              footer={
                validationResult.errors.length > 5 && (
                  <Text type="secondary">
                    ...и еще {validationResult.errors.length - 5} ошибок
                  </Text>
                )
              }
            />
          }
          type="error"
          showIcon
        />
      )}

      {uploading && (
        <Progress percent={uploadProgress} status="active" />
      )}
    </Space>
  );
};
