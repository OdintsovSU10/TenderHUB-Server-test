import { forwardRef, useImperativeHandle, useState } from 'react';
import { Table, Form } from 'antd';
import { MaterialLibraryFull } from '../../../lib/supabase';
import { useMaterialsData } from './hooks/useMaterialsData';
import { useMaterialsActions } from './hooks/useMaterialsActions';
import { MaterialsAddForm } from './components/MaterialsAddForm';
import { getMaterialsTableColumns } from './components/MaterialsTableColumns';
import { MaterialsEditableCell } from './components/MaterialsEditableCell';

interface MaterialsTabProps {
  searchText: string;
}

const MaterialsTab = forwardRef<any, MaterialsTabProps>((props, ref) => {
  const { searchText } = props;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const { data, loading, materialNames, fetchMaterials } = useMaterialsData();
  const actions = useMaterialsActions(materialNames, fetchMaterials);

  useImperativeHandle(ref, () => ({
    handleAdd: actions.handleAdd,
  }));

  const getRowClassName = (record: MaterialLibraryFull) => {
    if (actions.isEditing(record)) return 'editable-row';
    switch (record.item_type) {
      case 'мат':
        return 'material-row-mat';
      case 'суб-мат':
        return 'material-row-sub-mat';
      case 'мат-комп.':
        return 'material-row-mat-comp';
      default:
        return '';
    }
  };

  const columns = getMaterialsTableColumns({
    currentPage,
    pageSize,
    isEditing: actions.isEditing,
    onEdit: actions.edit,
    onSave: actions.save,
    onCancel: actions.cancel,
    onDelete: actions.handleDelete,
    editingKey: actions.editingKey,
    selectedUnit: actions.selectedUnit,
  });

  const mergedColumns = columns.map((col: any) => {
    if (!col.editable) {
      return col;
    }

    return {
      ...col,
      onCell: (record: MaterialLibraryFull) => ({
        record,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: actions.isEditing(record),
        materialNames,
        onMaterialNameSelect: actions.handleMaterialNameSelect,
      }),
    };
  });

  const filteredData = data.filter(item =>
    item.material_name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      {actions.isAdding && (
        <MaterialsAddForm
          form={actions.addForm}
          materialNames={materialNames}
          selectedAddUnit={actions.selectedAddUnit}
          addItemType={actions.addItemType}
          addDeliveryType={actions.addDeliveryType}
          onItemTypeChange={actions.setAddItemType}
          onDeliveryTypeChange={actions.setAddDeliveryType}
          onMaterialNameSelect={actions.handleAddMaterialNameSelect}
          onSubmit={actions.handleAddSubmit}
          onCancel={actions.cancelAdd}
        />
      )}

      <Form form={actions.form} component={false}>
        <Table
          components={{
            body: {
              cell: MaterialsEditableCell,
            },
          }}
          dataSource={filteredData}
          columns={mergedColumns}
          rowClassName={getRowClassName}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            pageSizeOptions: ['100', '250', '500', '1000'],
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
          loading={loading}
          rowKey="id"
          scroll={{ y: 600 }}
          size="small"
        />
      </Form>

      <style>{`
        .material-row-mat {
          background-color: rgba(33, 150, 243, 0.15) !important;
        }
        .material-row-mat:hover > td {
          background-color: rgba(33, 150, 243, 0.25) !important;
        }
        .material-row-sub-mat {
          background-color: rgba(156, 204, 101, 0.15) !important;
        }
        .material-row-sub-mat:hover > td {
          background-color: rgba(156, 204, 101, 0.25) !important;
        }
        .material-row-mat-comp {
          background-color: rgba(0, 137, 123, 0.15) !important;
        }
        .material-row-mat-comp:hover > td {
          background-color: rgba(0, 137, 123, 0.25) !important;
        }
      `}</style>
    </div>
  );
});

export default MaterialsTab;
