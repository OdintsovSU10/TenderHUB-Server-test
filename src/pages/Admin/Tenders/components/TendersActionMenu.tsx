import { EditOutlined, CopyOutlined, SwapOutlined, FileZipOutlined, DownloadOutlined, DeleteOutlined, RollbackOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { TenderRecord } from '../hooks/useTendersData';

interface GetActionMenuParams {
  record: TenderRecord;
  onEdit: (record: TenderRecord) => void;
  onDelete: (record: TenderRecord) => void;
  onCopy: (record: TenderRecord) => void;
  onNewVersion: (record: TenderRecord) => void;
  onArchive: (record: TenderRecord) => void;
  onUnarchive: (record: TenderRecord) => void;
  onExport: (record: TenderRecord) => void;
  isArchived: boolean;
}

export const getTendersActionMenu = (params: GetActionMenuParams): MenuProps['items'] => {
  const { record, onEdit, onDelete, onCopy, onNewVersion, onArchive, onUnarchive, onExport, isArchived } = params;

  return [
    {
      key: 'edit',
      label: 'Редактировать',
      icon: <EditOutlined />,
      onClick: () => onEdit(record),
    },
    {
      key: 'copy',
      label: 'Дублировать',
      icon: <CopyOutlined />,
      onClick: () => onCopy(record),
    },
    {
      key: 'new_version',
      label: 'Новая версия',
      icon: <SwapOutlined />,
      onClick: () => onNewVersion(record),
    },
    {
      type: 'divider',
    },
    ...(isArchived
      ? [{
          key: 'unarchive',
          label: 'Вернуть в работу',
          icon: <RollbackOutlined />,
          onClick: () => onUnarchive(record),
        }]
      : [{
          key: 'archive',
          label: 'В архив',
          icon: <FileZipOutlined />,
          onClick: () => onArchive(record),
        }]
    ),
    {
      key: 'export',
      label: 'Экспортировать',
      icon: <DownloadOutlined />,
      onClick: () => onExport(record),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Удалить',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => onDelete(record),
    },
  ];
};
