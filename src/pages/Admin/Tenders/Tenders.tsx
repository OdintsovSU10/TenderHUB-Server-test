import React, { useState } from 'react';
import { Table, message } from 'antd';
import TenderModal from './TenderModal';
import UploadBOQModal from './UploadBOQModal';
import { VersionMatchModal } from './VersionMatch';
import { useTendersData, type TenderRecord } from './hooks/useTendersData';
import { useTenderActions } from './hooks/useTenderActions';
import { getTendersTableColumns } from './components/TendersTableColumns';
import { getTendersActionMenu } from './components/TendersActionMenu';
import { TendersToolbar } from './components/TendersToolbar';
import { supabase, type Tender } from '../../../lib/supabase';
import './Tenders.css';

const Tenders: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [uploadBOQVisible, setUploadBOQVisible] = useState(false);
  const [selectedTenderForUpload, setSelectedTenderForUpload] = useState<TenderRecord | null>(null);
  const [versionMatchVisible, setVersionMatchVisible] = useState(false);
  const [selectedTenderForVersion, setSelectedTenderForVersion] = useState<Tender | null>(null);

  const { tendersData, loading, fetchTenders } = useTendersData();
  const actions = useTenderActions(fetchTenders);

  const handleOpenUploadBOQ = (record: TenderRecord) => {
    setSelectedTenderForUpload(record);
    setUploadBOQVisible(true);
  };

  const handleCloseUploadBOQ = () => {
    setUploadBOQVisible(false);
    setSelectedTenderForUpload(null);
  };

  const handleUploadSuccess = () => {
    message.success('Позиции заказчика успешно загружены');
  };

  const handleExportAll = () => {
    message.success('Экспорт всех тендеров начат');
  };

  const handleCopy = (record: TenderRecord) => {
    message.success(`Тендер скопирован: ${record.tender}`);
  };

  const handleArchive = (record: TenderRecord) => {
    message.info(`Тендер отправлен в архив: ${record.tender}`);
  };

  const handleExport = (record: TenderRecord) => {
    message.success(`Экспорт тендера: ${record.tender}`);
  };

  const handleNewVersion = async (record: TenderRecord) => {
    try {
      const { data: tenderData, error } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', record.id)
        .single();

      if (error) {
        message.error('Ошибка загрузки данных тендера');
        return;
      }

      if (tenderData) {
        setSelectedTenderForVersion(tenderData);
        setVersionMatchVisible(true);
      }
    } catch (error: any) {
      message.error('Ошибка: ' + error.message);
    }
  };

  const getActionMenu = (record: TenderRecord) => {
    return getTendersActionMenu({
      record,
      onEdit: actions.handleEdit,
      onDelete: actions.handleDelete,
      onCopy: handleCopy,
      onNewVersion: handleNewVersion,
      onArchive: handleArchive,
      onExport: handleExport,
    });
  };

  const columns = getTendersTableColumns({
    onOpenUploadBOQ: handleOpenUploadBOQ,
    getActionMenu,
  });

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const filteredData = tendersData.filter(item =>
    searchText === '' ||
    item.tender.toLowerCase().includes(searchText.toLowerCase()) ||
    item.tenderNumber.toLowerCase().includes(searchText.toLowerCase()) ||
    item.description.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div style={{ padding: '0' }}>
      <TendersToolbar
        searchText={searchText}
        onSearchChange={setSearchText}
        onExportAll={handleExportAll}
        onCreateNew={actions.handleCreateNewTender}
      />

      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total} тендеров`,
        }}
        scroll={{ x: 'max-content' }}
        size="small"
        locale={{
          emptyText: 'Нет тендеров для отображения. Создайте первый тендер или импортируйте данные.'
        }}
        className="tenders-table"
        style={{
          borderRadius: 8,
        }}
      />

      <TenderModal
        visible={actions.isModalVisible}
        form={actions.form}
        onOk={actions.handleModalOk}
        onCancel={actions.handleModalCancel}
        isEditMode={actions.isEditMode}
      />

      {selectedTenderForUpload && (
        <UploadBOQModal
          visible={uploadBOQVisible}
          tenderId={selectedTenderForUpload.id}
          tenderName={selectedTenderForUpload.tender}
          onCancel={handleCloseUploadBOQ}
          onSuccess={handleUploadSuccess}
        />
      )}

      <VersionMatchModal
        open={versionMatchVisible}
        onClose={() => {
          setVersionMatchVisible(false);
          setSelectedTenderForVersion(null);
          fetchTenders();
        }}
        tender={selectedTenderForVersion}
      />
    </div>
  );
};

export default Tenders;
