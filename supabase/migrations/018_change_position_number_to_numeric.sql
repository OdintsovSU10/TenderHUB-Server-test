-- Изменить тип position_number с integer на numeric для поддержки дополнительных работ (5.1, 5.2 и т.д.)
ALTER TABLE public.client_positions
ALTER COLUMN position_number TYPE numeric(10,2) USING position_number::numeric;

-- Добавить комментарий
COMMENT ON COLUMN public.client_positions.position_number IS 'Номер позиции, поддерживает decimal для дополнительных работ (например: 5.1, 5.2)';
