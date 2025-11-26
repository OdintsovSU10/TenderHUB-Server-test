import { TabKey, MarkupSequences, BaseCosts, OperandState } from './types';

export const ACTIONS = [
  { value: 'multiply', label: '× Умножить', symbol: '×' },
  { value: 'divide', label: '÷ Разделить', symbol: '÷' },
  { value: 'add', label: '+ Сложить', symbol: '+' },
  { value: 'subtract', label: '− Вычесть', symbol: '−' },
] as const;

export const TAB_KEYS: TabKey[] = [
  'works',
  'materials',
  'subcontract_works',
  'subcontract_materials',
  'work_comp',
  'material_comp',
];

export const TAB_LABELS: Record<TabKey, string> = {
  'works': 'Работы (раб)',
  'materials': 'Материалы (мат)',
  'subcontract_works': 'Субподрядные работы (суб-раб)',
  'subcontract_materials': 'Субподрядные материалы (суб-мат)',
  'work_comp': 'Работы компании (раб-комп.)',
  'material_comp': 'Материалы компании (мат-комп.)',
};

export const INITIAL_MARKUP_SEQUENCES: MarkupSequences = {
  'works': [],
  'materials': [],
  'subcontract_works': [],
  'subcontract_materials': [],
  'work_comp': [],
  'material_comp': [],
};

export const INITIAL_BASE_COSTS: BaseCosts = {
  'works': 0,
  'materials': 0,
  'subcontract_works': 0,
  'subcontract_materials': 0,
  'work_comp': 0,
  'material_comp': 0,
};

export function createInitialOperandState<T>(defaultValue: T): OperandState<T> {
  return {
    'works': defaultValue,
    'materials': defaultValue,
    'subcontract_works': defaultValue,
    'subcontract_materials': defaultValue,
    'work_comp': defaultValue,
    'material_comp': defaultValue,
  };
}