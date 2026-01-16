import React, { useEffect } from 'react';
import { Card, Space, Typography, Form, InputNumber, Row, Col, Button, Spin, message } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMarkupConstructorContext } from '../MarkupConstructorContext';

const { Title, Text } = Typography;

/**
 * Форма для редактирования базовых значений процентов параметров наценок
 * Отображается на вкладке "Базовые проценты"
 */
export const BasePercentagesForm: React.FC = () => {
  const { parameters } = useMarkupConstructorContext();
  const [form] = Form.useForm();

  // Загрузить параметры при монтировании
  useEffect(() => {
    parameters.fetchParameters();
  }, []);

  // Заполнить форму при загрузке параметров
  useEffect(() => {
    if (parameters.markupParameters.length > 0) {
      const initialValues: Record<string, number> = {};
      parameters.markupParameters.forEach((param) => {
        initialValues[param.key] = param.default_value || 0;
      });
      form.setFieldsValue(initialValues);
    }
  }, [parameters.markupParameters, form]);

  // Обработчик сохранения базовых процентов
  const handleSave = async () => {
    try {
      const values = form.getFieldsValue();

      // Обновить default_value для каждого параметра
      for (const param of parameters.markupParameters) {
        const newValue = values[param.key];
        if (newValue !== param.default_value) {
          await parameters.updateParameter(param.id, {
            default_value: newValue,
          });
        }
      }

      message.success('Базовые проценты сохранены');
    } catch (error) {
      console.error('Error saving base percentages:', error);
      message.error('Ошибка при сохранении базовых процентов');
    }
  };

  // Обработчик сброса формы
  const handleReset = () => {
    const defaultValues: Record<string, number> = {};
    parameters.markupParameters.forEach((param) => {
      defaultValues[param.key] = param.default_value || 0;
    });
    form.setFieldsValue(defaultValues);
    message.info('Форма сброшена к исходным значениям');
  };

  return (
    <Card
      title={
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0 }}>
            Базовые проценты наценок
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Задайте базовые значения процентов по умолчанию
          </Text>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Сбросить
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={parameters.loadingParameters}
          >
            Сохранить
          </Button>
        </Space>
      }
    >
      <Spin spinning={parameters.loadingParameters}>
        {parameters.loadingParameters ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Text>Загрузка параметров наценок...</Text>
          </div>
        ) : parameters.markupParameters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Text type="danger">
              Параметры наценок не найдены. Сначала создайте параметры на вкладке "Управление
              параметрами".
            </Text>
          </div>
        ) : (
          <Form
            form={form}
            layout="horizontal"
            labelCol={{ style: { width: '250px', textAlign: 'left' } }}
            wrapperCol={{ style: { flex: 1 } }}
          >
            <Row gutter={[16, 0]}>
              {parameters.markupParameters.map((param, index) => (
                <Col span={24} key={param.id}>
                  <Form.Item
                    label={`${index + 1}. ${param.label}`}
                    name={param.key}
                    style={{ marginBottom: '4px' }}
                  >
                    <InputNumber
                      min={0}
                      max={999.99}
                      step={0.01}
                      addonAfter="%"
                      style={{ width: '120px' }}
                      precision={2}
                    />
                  </Form.Item>
                </Col>
              ))}
            </Row>
          </Form>
        )}
      </Spin>
    </Card>
  );
};
