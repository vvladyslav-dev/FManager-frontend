import React from 'react';
import { Form, Input, Select, Space, Button, Checkbox, Card } from 'antd';
import { DeleteOutlined, PlusOutlined, CloseOutlined, HolderOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { TextArea } = Input;

interface FormFieldEditorProps {
  fieldIndex: number;
  restField: any;
  name: number;
  fieldValue: any;
  currentOptions: string[];
  fieldOptions: Record<number, string[]>;
  setFieldOptions: React.Dispatch<React.SetStateAction<Record<number, string[]>>>;
  form: any;
  fieldErrors?: Record<number, boolean>;
  setFieldErrors?: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  onRemove: () => void;
  onMove?: (direction: 'up' | 'down') => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isMobile?: boolean;
  showDragHandle?: boolean;
  showQuestionNumber?: boolean;
  generateFieldName?: (label: string) => string;
}

const FormFieldEditor: React.FC<FormFieldEditorProps> = ({
  fieldIndex,
  restField,
  name,
  fieldValue,
  currentOptions,
  fieldOptions,
  setFieldOptions,
  form,
  fieldErrors,
  setFieldErrors,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
  isMobile = false,
  showDragHandle = false,
  showQuestionNumber = false,
  generateFieldName,
}) => {
  const { t } = useTranslation();

  return (
    <Card
      data-field-index={fieldIndex}
      style={{
        marginBottom: 16,
        borderRadius: 12,
        border: fieldErrors?.[fieldIndex] ? '2px solid #FF4D4F' : '1px solid #E5E7EB',
        boxShadow: fieldErrors?.[fieldIndex] ? '0 0 0 2px rgba(255, 77, 79, 0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
        background: '#fff',
        transition: 'all 0.2s ease'
      }}
      bodyStyle={{ padding: '20px' }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Drag Handle */}
        {showDragHandle && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 4,
            paddingTop: 4
          }}>
            {onMove && canMoveUp && (
              <Button
                type="text"
                icon={<ArrowUpOutlined />}
                onClick={() => onMove('up')}
                style={{ color: '#9CA3AF', padding: 0, height: 20 }}
                size="small"
              />
            )}
            <div style={{ 
              padding: '4px 0',
              cursor: 'grab'
            }}>
              <HolderOutlined style={{ color: '#9CA3AF', fontSize: 18 }} />
            </div>
            {onMove && canMoveDown && (
              <Button
                type="text"
                icon={<ArrowDownOutlined />}
                onClick={() => onMove('down')}
                style={{ color: '#9CA3AF', padding: 0, height: 20 }}
                size="small"
              />
            )}
          </div>
        )}

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* Header: Question Number, Required Checkbox, Delete */}
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? 12 : 0,
            marginBottom: 16
          }}>
            {showQuestionNumber && (
              <span style={{ 
                fontSize: isMobile ? 14 : 16, 
                fontWeight: 600, 
                color: '#111827',
                flex: isMobile ? 'none' : 1,
                minWidth: 0
              }}>
                {t('createForm.question')} {String(fieldIndex + 1).padStart(2, '0')}
              </span>
            )}
            <Space style={{ flexShrink: 0 }}>
              <Form.Item 
                {...restField} 
                name={[name, 'is_required']} 
                valuePropName="checked"
                style={{ margin: 0 }}
              >
                <Checkbox style={{ fontSize: isMobile ? 13 : 14 }}>{t('createForm.required')}</Checkbox>
              </Form.Item>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={onRemove}
                style={{ color: '#EF4444' }}
                size={isMobile ? 'small' : 'middle'}
              />
            </Space>
          </div>

          {/* Question Type */}
          <Form.Item
            {...restField}
            name={[name, 'field_type']}
            rules={[{ required: true, message: t('createForm.fieldType') }]}
            style={{ marginBottom: 16 }}
          >
            <Select 
              placeholder={t('createForm.fieldType')} 
              style={{ 
                borderRadius: 8, 
                height: isMobile ? 44 : 40,
                width: '100%'
              }}
              size={isMobile ? 'large' : 'large'}
              onChange={(value) => {
                // Initialize options immediately when select/multiselect is chosen
                if (value === 'select' || value === 'multiselect') {
                  setFieldOptions(prev => {
                    // Only initialize if not already set or if empty
                    if (!prev[fieldIndex] || prev[fieldIndex].length === 0) {
                      return { ...prev, [fieldIndex]: [''] };
                    }
                    return prev;
                  });
                  // Clear error when switching to select/multiselect
                  if (setFieldErrors) {
                    setFieldErrors(prev => ({ ...prev, [fieldIndex]: false }));
                  }
                } else {
                  // Clear options if switching away from select/multiselect
                  setFieldOptions(prev => {
                    const newOptions = { ...prev };
                    delete newOptions[fieldIndex];
                    return newOptions;
                  });
                  form.setFieldValue(['fields', name, 'options'], undefined);
                  // Clear error when switching away from select/multiselect
                  if (setFieldErrors) {
                    setFieldErrors(prev => ({ ...prev, [fieldIndex]: false }));
                  }
                }
              }}
            >
              <Select.Option value="text">{t('createForm.shortQuestion')}</Select.Option>
              <Select.Option value="textarea">{t('createForm.longQuestion')}</Select.Option>
              <Select.Option value="number">{t('createForm.number')}</Select.Option>
              <Select.Option value="date">{t('createForm.date')}</Select.Option>
              <Select.Option value="select">{t('createForm.select')}</Select.Option>
              <Select.Option value="multiselect">{t('createForm.multiSelect')}</Select.Option>
              <Select.Option value="file">{t('createForm.file')}</Select.Option>
            </Select>
          </Form.Item>

          {/* Question Text */}
          <Form.Item
            {...restField}
            name={[name, 'label']}
            label={<span style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>{t('createForm.fieldLabel')}</span>}
            rules={[{ required: true, message: t('createForm.questionPlaceholder') }]}
            style={{ marginBottom: 16 }}
          >
            <Input 
              placeholder={t('createForm.questionPlaceholder')}
              style={{ borderRadius: 8, height: 44, fontSize: 15 }}
              size="large"
              onChange={(e) => {
                // Auto-generate name from label
                if (generateFieldName) {
                  const generatedName = generateFieldName(e.target.value);
                  form.setFieldValue(['fields', name, 'name'], generatedName);
                }
              }}
            />
          </Form.Item>

          {/* Placeholder (optional) */}
          <Form.Item
            {...restField}
            name={[name, 'placeholder']}
            label={<span style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>{t('createForm.placeholder')}</span>}
            style={{ marginBottom: (fieldValue?.field_type === 'select' || fieldValue?.field_type === 'multiselect') ? 16 : 0 }}
          >
            <Input 
              placeholder={t('createForm.placeholder')}
              style={{ borderRadius: 8, height: 44, fontSize: 15 }}
              size="large"
            />
          </Form.Item>

          {/* Options for Select/Multiselect field */}
          {(fieldValue?.field_type === 'select' || fieldValue?.field_type === 'multiselect') && (
            <Form.Item
              {...restField}
              name={[name, 'options']}
              label={<span style={{ fontWeight: 500, color: '#374151', fontSize: 14 }}>{t('createForm.options')}</span>}
              style={{ marginBottom: 0 }}
              required
              validateStatus={fieldErrors?.[fieldIndex] ? 'error' : ''}
              help={fieldErrors?.[fieldIndex] ? <span style={{ color: '#FF4D4F' }}>{t('createForm.pleaseAddOption')}</span> : null}
              rules={[
                { 
                  validator: () => {
                    const validOptions = currentOptions.filter((opt: string) => opt && opt.trim() !== '');
                    if (validOptions.length === 0) {
                      return Promise.reject(new Error(t('createForm.pleaseAddOption')));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <div>
                {currentOptions.map((option: string, optIndex: number) => (
                  <Space key={optIndex} style={{ display: 'flex', marginBottom: 8, width: '100%' }} align="baseline">
                    <Input 
                      value={option}
                      placeholder={t('createForm.enterOption')} 
                      style={{ 
                        borderRadius: 8, 
                        flex: 1, 
                        minWidth: isMobile ? 0 : 300,
                        width: '100%'
                      }}
                      onChange={(e) => {
                        const newOptions = [...currentOptions];
                        newOptions[optIndex] = e.target.value;
                        setFieldOptions(prev => ({ ...prev, [fieldIndex]: newOptions }));
                        form.setFieldValue(['fields', name, 'options'], JSON.stringify(newOptions));
                        // Clear error if valid options are added
                        const validOptions = newOptions.filter((opt: string) => opt && opt.trim() !== '');
                        if (validOptions.length > 0 && fieldErrors?.[fieldIndex] && setFieldErrors) {
                          setFieldErrors(prev => ({ ...prev, [fieldIndex]: false }));
                          form.validateFields([['fields', name, 'options']]).catch(() => {});
                        }
                      }}
                    />
                    <Button
                      type="text"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => {
                        const newOptions = currentOptions.filter((_: string, i: number) => i !== optIndex);
                        setFieldOptions(prev => ({ ...prev, [fieldIndex]: newOptions }));
                        form.setFieldValue(['fields', name, 'options'], newOptions.length > 0 ? JSON.stringify(newOptions) : undefined);
                        // Check if error should be shown
                        const validOptions = newOptions.filter((opt: string) => opt && opt.trim() !== '');
                        if (validOptions.length === 0 && setFieldErrors) {
                          setFieldErrors(prev => ({ ...prev, [fieldIndex]: true }));
                        } else if (setFieldErrors) {
                          setFieldErrors(prev => ({ ...prev, [fieldIndex]: false }));
                          form.validateFields([['fields', name, 'options']]).catch(() => {});
                        }
                      }}
                      style={{ color: '#EF4444', flexShrink: 0 }}
                    />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => {
                    const newOptions = [...currentOptions, ''];
                    setFieldOptions(prev => ({ ...prev, [fieldIndex]: newOptions }));
                    // Clear error when adding new option field
                    if (fieldErrors?.[fieldIndex] && setFieldErrors) {
                      setFieldErrors(prev => ({ ...prev, [fieldIndex]: false }));
                    }
                  }}
                  block
                  icon={<PlusOutlined />}
                  style={{
                    borderRadius: 8,
                    border: '1px dashed #D1D5DB',
                    color: '#6B7280',
                    height: 40,
                    fontSize: 14
                  }}
                >
                  {t('createForm.addOption')}
                </Button>
              </div>
            </Form.Item>
          )}

          {/* Hidden field for name (auto-generated) */}
          <Form.Item {...restField} name={[name, 'name']} hidden>
            <Input />
          </Form.Item>
        </div>
      </div>
    </Card>
  );
};

export default FormFieldEditor;

