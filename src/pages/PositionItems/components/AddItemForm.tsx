import React from 'react';
import { AutoComplete, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { WorkLibraryFull, MaterialLibraryFull } from '../../../lib/supabase';

interface Template {
  id: string;
  name: string;
  detail_cost_category_id: string | null;
}

interface AddItemFormProps {
  works: WorkLibraryFull[];
  materials: MaterialLibraryFull[];
  templates: Template[];
  workSearchText: string;
  materialSearchText: string;
  templateSearchText: string;
  onWorkSearchChange: (value: string) => void;
  onMaterialSearchChange: (value: string) => void;
  onTemplateSearchChange: (value: string) => void;
  onAddWork: (workNameId: string) => void;
  onAddMaterial: (materialNameId: string) => void;
  onAddTemplate: (templateId: string) => void;
}

const AddItemForm: React.FC<AddItemFormProps> = ({
  works,
  materials,
  templates,
  workSearchText,
  materialSearchText,
  templateSearchText,
  onWorkSearchChange,
  onMaterialSearchChange,
  onTemplateSearchChange,
  onAddWork,
  onAddMaterial,
  onAddTemplate,
}) => {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {/* Колонка 1: Добавить работу */}
      <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
        <AutoComplete
          style={{ flex: 1 }}
          placeholder="Выберите или начните вводить работу..."
          options={works
            .filter(w => {
              if (!workSearchText) return true;
              return w.work_name.toLowerCase().includes(workSearchText.toLowerCase());
            })
            .slice(0, 100)
            .map(w => ({
              value: w.work_name,
              label: w.work_name,
            }))
          }
          value={workSearchText}
          onChange={onWorkSearchChange}
          onSelect={onWorkSearchChange}
          onClear={() => onWorkSearchChange('')}
          allowClear
          filterOption={false}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: '#10b981' }}
          disabled={!workSearchText || works.filter(w =>
            w.work_name.toLowerCase().includes(workSearchText.toLowerCase())
          ).length === 0}
          onClick={() => {
            const work = works.find(w =>
              w.work_name.toLowerCase() === workSearchText.toLowerCase() ||
              w.work_name.toLowerCase().includes(workSearchText.toLowerCase())
            );
            if (work) {
              onAddWork(work.work_name_id);
            }
          }}
        />
      </div>

      {/* Колонка 2: Добавить материал */}
      <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
        <AutoComplete
          style={{ flex: 1 }}
          placeholder="Выберите или начните вводить материал..."
          options={materials
            .filter(m => {
              if (!materialSearchText) return true;
              return m.material_name.toLowerCase().includes(materialSearchText.toLowerCase());
            })
            .slice(0, 100)
            .map(m => ({
              value: m.material_name,
              label: m.material_name,
            }))
          }
          value={materialSearchText}
          onChange={onMaterialSearchChange}
          onSelect={onMaterialSearchChange}
          onClear={() => onMaterialSearchChange('')}
          allowClear
          filterOption={false}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: '#10b981' }}
          disabled={!materialSearchText || materials.filter(m =>
            m.material_name.toLowerCase().includes(materialSearchText.toLowerCase())
          ).length === 0}
          onClick={() => {
            const material = materials.find(m =>
              m.material_name.toLowerCase() === materialSearchText.toLowerCase() ||
              m.material_name.toLowerCase().includes(materialSearchText.toLowerCase())
            );
            if (material) {
              onAddMaterial(material.material_name_id);
            }
          }}
        />
      </div>

      {/* Колонка 3: Добавить по шаблону */}
      <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
        <AutoComplete
          style={{ flex: 1 }}
          placeholder="Выберите или начните вводить шаблон..."
          options={templates
            .filter(t => {
              if (!templateSearchText) return true;
              return t.name.toLowerCase().includes(templateSearchText.toLowerCase());
            })
            .map(t => ({
              value: t.name,
              label: t.name,
            }))
          }
          value={templateSearchText}
          onChange={onTemplateSearchChange}
          onSelect={onTemplateSearchChange}
          onClear={() => onTemplateSearchChange('')}
          allowClear
          filterOption={false}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ background: '#10b981' }}
          disabled={!templateSearchText || templates.filter(t =>
            t.name.toLowerCase().includes(templateSearchText.toLowerCase())
          ).length === 0}
          onClick={() => {
            const template = templates.find(t =>
              t.name.toLowerCase() === templateSearchText.toLowerCase() ||
              t.name.toLowerCase().includes(templateSearchText.toLowerCase())
            );
            if (template) {
              onAddTemplate(template.id);
            }
          }}
        />
      </div>
    </div>
  );
};

export default AddItemForm;
