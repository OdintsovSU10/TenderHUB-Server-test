import React, { useState } from 'react';
import { Form, message, Tabs, Typography } from 'antd';
import { useTheme } from '../../contexts/ThemeContext';
import InsertTemplateIntoPositionModal from './InsertTemplateIntoPositionModal';
import { useTemplates } from './hooks/useTemplates';
import { useTemplateItems } from './hooks/useTemplateItems';
import { useLibraryData } from './hooks/useLibraryData';
import { useTemplateCreation } from './hooks/useTemplateCreation';
import { useTemplateEditing } from './hooks/useTemplateEditing';
import { TemplatesList } from './components/TemplatesList';
import { TemplateEditor } from './components/TemplateEditor';
import { TemplateFilters } from './components/TemplateFilters';
import { createTemplateColumns, getRowClassName } from './utils/templateColumns';
import { templateRowStyles } from './utils/templateStyles';
import type { TemplateItemWithDetails } from './hooks/useTemplateItems';

const { Text } = Typography;

const Templates: React.FC = () => {
  const [form] = Form.useForm();
  const { theme: currentTheme } = useTheme();

  const { templates, loading, setLoading, fetchTemplates, handleDeleteTemplate } = useTemplates();
  const { loadedTemplateItems, setLoadedTemplateItems, fetchAllTemplateItems, handleDeleteTemplateItem } = useTemplateItems();
  const { works, materials, costCategories } = useLibraryData();

  const {
    templateItems,
    setTemplateItems,
    selectedWork,
    setSelectedWork,
    selectedMaterial,
    setSelectedMaterial,
    addWork,
    addMaterial,
    deleteItem,
    saveTemplate,
    resetCreation,
  } = useTemplateCreation(works, materials, costCategories);

  const {
    editingTemplateForm,
    editingTemplate,
    editingTemplateCostCategorySearchText,
    setEditingTemplateCostCategorySearchText,
    editingItems,
    setEditingItems,
    startEditing,
    cancelEditing,
    saveEditing,
    addWorkToTemplate,
    addMaterialToTemplate,
  } = useTemplateEditing(loadedTemplateItems, setLoadedTemplateItems, costCategories);

  const [activeTab, setActiveTab] = useState<string>('list');
  const [workSearchText, setWorkSearchText] = useState('');
  const [materialSearchText, setMaterialSearchText] = useState('');
  const [costCategorySearchText, setCostCategorySearchText] = useState('');

  const [editingTemplateItems, setEditingTemplateItems] = useState<string | null>(null);
  const [editingWorkSearchText, setEditingWorkSearchText] = useState('');
  const [editingMaterialSearchText, setEditingMaterialSearchText] = useState('');
  const [editingSelectedWork, setEditingSelectedWork] = useState<string | null>(null);
  const [editingSelectedMaterial, setEditingSelectedMaterial] = useState<string | null>(null);

  const [templateSearchText, setTemplateSearchText] = useState('');
  const [filterCostCategory, setFilterCostCategory] = useState<string | null>(null);
  const [filterDetailCategory, setFilterDetailCategory] = useState<string | null>(null);
  const [openedTemplate, setOpenedTemplate] = useState<string | null>(null);

  const [insertModalOpen, setInsertModalOpen] = useState(false);
  const [selectedTemplateForInsert, setSelectedTemplateForInsert] = useState<string | null>(null);

  const handleAddWork = () => {
    if (!selectedWork) {
      message.warning('Выберите работу');
      return;
    }
    const work = works.find((w) => w.id === selectedWork);
    if (!work) return;

    const templateCostCategoryId = form.getFieldValue('detail_cost_category_id');
    addWork(work, templateCostCategoryId);
    setSelectedWork(null);
    setWorkSearchText('');
  };

  const handleAddMaterial = () => {
    if (!selectedMaterial) {
      message.warning('Выберите материал');
      return;
    }
    const material = materials.find((m) => m.id === selectedMaterial);
    if (!material) return;

    const templateCostCategoryId = form.getFieldValue('detail_cost_category_id');
    addMaterial(material, templateCostCategoryId);
    setSelectedMaterial(null);
    setMaterialSearchText('');
  };

  const handleSaveTemplate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const success = await saveTemplate(values.name, values.detail_cost_category_id);
      if (success) {
        message.success('Шаблон успешно создан');
        form.resetFields();
        resetCreation();
        setWorkSearchText('');
        setMaterialSearchText('');
        setCostCategorySearchText('');
        fetchTemplates();
        fetchAllTemplateItems();
      }
    } catch (error: any) {
      message.error('Ошибка создания шаблона: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    resetCreation();
    setWorkSearchText('');
    setMaterialSearchText('');
    setCostCategorySearchText('');
  };

  const handleUpdateItemCoeff = (id: string, value: number | null, templateId?: string) => {
    if (editingTemplate) {
      setEditingItems(editingItems.map((item) => (item.id === id ? { ...item, conversation_coeff: value } : item)));
    } else if (templateId) {
      setLoadedTemplateItems(prev => ({
        ...prev,
        [templateId]: (prev[templateId] || []).map((item) => (item.id === id ? { ...item, conversation_coeff: value } : item)),
      }));
    } else {
      setTemplateItems(templateItems.map((item) => (item.id === id ? { ...item, conversation_coeff: value } : item)));
    }
  };

  const handleUpdateItemParent = (id: string, parentId: string | null, templateId?: string) => {
    if (editingTemplate) {
      setEditingItems(editingItems.map((item) => (item.id === id ? { ...item, parent_work_item_id: parentId } : item)));
    } else if (templateId) {
      setLoadedTemplateItems(prev => ({
        ...prev,
        [templateId]: (prev[templateId] || []).map((item) => (item.id === id ? { ...item, parent_work_item_id: parentId } : item)),
      }));
    } else {
      setTemplateItems(templateItems.map((item) => (item.id === id ? { ...item, parent_work_item_id: parentId } : item)));
    }
  };

  const handleAddWorkToTemplate = async (templateId: string) => {
    if (!editingSelectedWork) {
      message.warning('Выберите работу');
      return;
    }
    try {
      const work = works.find((w) => w.id === editingSelectedWork);
      if (!work) return;
      await addWorkToTemplate(templateId, work);
      setEditingSelectedWork(null);
      setEditingWorkSearchText('');
    } catch (error: any) {
      message.error('Ошибка добавления работы: ' + error.message);
    }
  };

  const handleAddMaterialToTemplate = async (templateId: string) => {
    if (!editingSelectedMaterial) {
      message.warning('Выберите материал');
      return;
    }
    try {
      const material = materials.find((m) => m.id === editingSelectedMaterial);
      if (!material) return;
      await addMaterialToTemplate(templateId, material);
      setEditingSelectedMaterial(null);
      setEditingMaterialSearchText('');
    } catch (error: any) {
      message.error('Ошибка добавления материала: ' + error.message);
    }
  };

  const getCostCategoryOptions = (searchText: string) => {
    return costCategories
      .filter((c) => c.label.toLowerCase().includes(searchText.toLowerCase()))
      .map((c) => ({
        value: c.label,
        id: c.value,
        label: c.label,
      }));
  };

  const getColumns = (
    isCreating: boolean = false,
    currentItems: TemplateItemWithDetails[] = [],
    templateId?: string,
    isEditing: boolean = false,
    isAddingItems: boolean = false
  ) => {
    return createTemplateColumns(
      isCreating,
      currentItems,
      templateId,
      isEditing,
      isAddingItems,
      currentTheme,
      {
        handleUpdateItemParent,
        handleUpdateItemCoeff,
        handleDeleteItem: deleteItem,
        handleDeleteTemplateItem,
        getCostCategoryOptions,
        setTemplateItems,
        setEditingItems,
        setLoadedTemplateItems,
      }
    );
  };

  const filteredTemplates = templates.filter((template) => {
    if (templateSearchText.length >= 2 && !template.name.toLowerCase().includes(templateSearchText.toLowerCase())) {
      return false;
    }
    if (filterCostCategory && template.cost_category_name !== filterCostCategory) {
      return false;
    }
    if (filterDetailCategory && template.detail_category_name !== filterDetailCategory) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ margin: '-16px', padding: '24px' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'list',
            label: 'Список шаблонов',
            children: (
              <div>
                <TemplateFilters
                  templates={templates}
                  templateSearchText={templateSearchText}
                  setTemplateSearchText={setTemplateSearchText}
                  filterCostCategory={filterCostCategory}
                  setFilterCostCategory={setFilterCostCategory}
                  filterDetailCategory={filterDetailCategory}
                  setFilterDetailCategory={setFilterDetailCategory}
                  currentTheme={currentTheme}
                />

                <TemplatesList
                  templates={filteredTemplates}
                  loadedTemplateItems={loadedTemplateItems}
                  openedTemplate={openedTemplate}
                  setOpenedTemplate={setOpenedTemplate}
                  editingTemplate={editingTemplate}
                  editingTemplateForm={editingTemplateForm}
                  editingTemplateCostCategorySearchText={editingTemplateCostCategorySearchText}
                  setEditingTemplateCostCategorySearchText={setEditingTemplateCostCategorySearchText}
                  editingItems={editingItems}
                  costCategories={costCategories}
                  currentTheme={currentTheme}
                  onEditTemplate={startEditing}
                  onCancelEditTemplate={cancelEditing}
                  onSaveEditTemplate={(templateId) => saveEditing(templateId, setOpenedTemplate, fetchTemplates, fetchAllTemplateItems)}
                  onDeleteTemplate={handleDeleteTemplate}
                  onOpenInsertModal={(templateId) => {
                    setSelectedTemplateForInsert(templateId);
                    setInsertModalOpen(true);
                  }}
                  editingTemplateItems={editingTemplateItems}
                  setEditingTemplateItems={setEditingTemplateItems}
                  editingWorkSearchText={editingWorkSearchText}
                  setEditingWorkSearchText={setEditingWorkSearchText}
                  editingMaterialSearchText={editingMaterialSearchText}
                  setEditingMaterialSearchText={setEditingMaterialSearchText}
                  editingSelectedWork={editingSelectedWork}
                  setEditingSelectedWork={setEditingSelectedWork}
                  editingSelectedMaterial={editingSelectedMaterial}
                  setEditingSelectedMaterial={setEditingSelectedMaterial}
                  works={works}
                  materials={materials}
                  onAddWorkToTemplate={handleAddWorkToTemplate}
                  onAddMaterialToTemplate={handleAddMaterialToTemplate}
                  getColumns={getColumns}
                  getRowClassName={getRowClassName}
                />

                {filteredTemplates.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Text type="secondary">
                      {templates.length === 0 ? 'Нет созданных шаблонов' : 'Нет шаблонов, соответствующих критериям поиска'}
                    </Text>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'create',
            label: 'Создание шаблона',
            children: (
              <TemplateEditor
                form={form}
                templateItems={templateItems}
                costCategories={costCategories}
                costCategorySearchText={costCategorySearchText}
                setCostCategorySearchText={setCostCategorySearchText}
                works={works}
                workSearchText={workSearchText}
                setWorkSearchText={setWorkSearchText}
                selectedWork={selectedWork}
                setSelectedWork={setSelectedWork}
                materials={materials}
                materialSearchText={materialSearchText}
                setMaterialSearchText={setMaterialSearchText}
                selectedMaterial={selectedMaterial}
                setSelectedMaterial={setSelectedMaterial}
                currentTheme={currentTheme}
                onAddWork={handleAddWork}
                onAddMaterial={handleAddMaterial}
                onSaveTemplate={handleSaveTemplate}
                onCancel={handleCancel}
                loading={loading}
                getColumns={getColumns}
                getRowClassName={getRowClassName}
              />
            ),
          },
        ]}
      />

      <InsertTemplateIntoPositionModal
        open={insertModalOpen}
        templateId={selectedTemplateForInsert}
        onCancel={() => {
          setInsertModalOpen(false);
          setSelectedTemplateForInsert(null);
        }}
        onSuccess={() => {
          setInsertModalOpen(false);
          setSelectedTemplateForInsert(null);
        }}
      />

      <style>{templateRowStyles}</style>
    </div>
  );
};

export default Templates;
