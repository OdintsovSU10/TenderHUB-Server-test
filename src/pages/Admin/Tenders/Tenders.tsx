import React, { useState } from 'react';
import { Table, Tabs, message } from 'antd';
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
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
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
    actions.handleArchive(record);
  };

  const handleUnarchive = (record: TenderRecord) => {
    actions.handleUnarchive(record);
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
      onUnarchive: handleUnarchive,
      onExport: handleExport,
      isArchived: record.is_archived || false,
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

  const tabFilteredData = filteredData.filter(item => {
    if (activeTab === 'active') {
      return !item.is_archived;
    } else {
      return item.is_archived;
    }
  });

  return (
    <div style={{ padding: '0' }}>
      <TendersToolbar
        searchText={searchText}
        onSearchChange={setSearchText}
        onExportAll={handleExportAll}
        onCreateNew={actions.handleCreateNewTender}
        onRefresh={fetchTenders}
      />

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'active' | 'archive')}
        items={[
          {
            key: 'active',
            label: 'В работе',
            children: (
              <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={tabFilteredData}
                loading={loading}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 20, 50, 100],
                  showTotal: (total) => `Всего: ${total} тендеров`,
                }}
                scroll={{ x: 'max-content' }}
                size="small"
                locale={{
                  emptyText: 'Нет активных тендеров для отображения.'
                }}
                className="tenders-table"
                style={{
                  borderRadius: 8,
                }}
              />
            ),
          },
          {
            key: 'archive',
            label: 'Архив',
            children: (
              <Table
                rowSelection={rowSelection}
                columns={columns}
                dataSource={tabFilteredData}
                loading={loading}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 20, 50, 100],
                  showTotal: (total) => `Всего: ${total} тендеров`,
                }}
                scroll={{ x: 'max-content' }}
                size="small"
                locale={{
                  emptyText: 'Нет архивных тендеров для отображения.'
                }}
                className="tenders-table"
                style={{
                  borderRadius: 8,
                }}
              />
            ),
          },
        ]}
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
