import { forwardRef, useImperativeHandle, useState } from 'react';
import { Table, Form } from 'antd';
import { WorkLibraryFull } from '../../../lib/supabase';
import { useWorksData } from './hooks/useWorksData';
import { useWorksActions } from './hooks/useWorksActions';
import { WorksAddForm } from './components/WorksAddForm';
import { getWorksTableColumns } from './components/WorksTableColumns';
import { WorksEditableCell } from './components/WorksEditableCell';

interface WorksTabProps {
  searchText: string;
}

const WorksTab = forwardRef<any, WorksTabProps>((props, ref) => {
  const { searchText } = props;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const { data, loading, workNames, fetchWorks } = useWorksData();
  const actions = useWorksActions(workNames, fetchWorks);

  useImperativeHandle(ref, () => ({
    handleAdd: actions.handleAdd,
  }));

  const getRowClassName = (record: WorkLibraryFull) => {
    if (actions.isEditing(record)) return 'editable-row';
    switch (record.item_type) {
      case 'раб':
        return 'work-row-rab';
      case 'суб-раб':
        return 'work-row-sub-rab';
      case 'раб-комп.':
        return 'work-row-rab-comp';
      default:
        return '';
    }
  };

  const columns = getWorksTableColumns({
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
      onCell: (record: WorkLibraryFull) => ({
        record,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: actions.isEditing(record),
        workNames,
        onWorkNameSelect: actions.handleWorkNameSelect,
      }),
    };
  });

  const filteredData = data.filter(item =>
    item.work_name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      {actions.isAdding && (
        <WorksAddForm
          form={actions.addForm}
          workNames={workNames}
          selectedAddUnit={actions.selectedAddUnit}
          addItemType={actions.addItemType}
          onItemTypeChange={actions.setAddItemType}
          onWorkNameSelect={actions.handleAddWorkNameSelect}
          onSubmit={actions.handleAddSubmit}
          onCancel={actions.cancelAdd}
        />
      )}

      <Form form={actions.form} component={false}>
        <Table
          components={{
            body: {
              cell: WorksEditableCell,
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
        .work-row-rab {
          background-color: rgba(255, 152, 0, 0.15) !important;
        }
        .work-row-rab:hover > td {
          background-color: rgba(255, 152, 0, 0.25) !important;
        }
        .work-row-sub-rab {
          background-color: rgba(156, 39, 176, 0.15) !important;
        }
        .work-row-sub-rab:hover > td {
          background-color: rgba(156, 39, 176, 0.25) !important;
        }
        .work-row-rab-comp {
          background-color: rgba(244, 67, 54, 0.15) !important;
        }
        .work-row-rab-comp:hover > td {
          background-color: rgba(244, 67, 54, 0.25) !important;
        }
      `}</style>
    </div>
  );
});

export default WorksTab;
