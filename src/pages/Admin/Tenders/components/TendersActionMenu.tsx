import { EditOutlined, CopyOutlined, FileZipOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { TenderRecord } from '../hooks/useTendersData';

interface GetActionMenuParams {
  record: TenderRecord;
  onEdit: (record: TenderRecord) => void;
  onDelete: (record: TenderRecord) => void;
  onCopy: (record: TenderRecord) => void;
  onArchive: (record: TenderRecord) => void;
  onExport: (record: TenderRecord) => void;
}

export const getTendersActionMenu = (params: GetActionMenuParams): MenuProps['items'] => {
  const { record, onEdit, onDelete, onCopy, onArchive, onExport } = params;

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
      type: 'divider',
    },
    {
      key: 'archive',
      label: 'В архив',
      icon: <FileZipOutlined />,
      onClick: () => onArchive(record),
    },
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
