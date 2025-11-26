import React from 'react';
import { Typography } from 'antd';
import dayjs from 'dayjs';
import type { Tender } from '../../../lib/supabase';

const { Text } = Typography;

interface DeadlineBarProps {
  selectedTender: Tender;
  currentTheme: string;
}

export const DeadlineBar: React.FC<DeadlineBarProps> = ({ selectedTender, currentTheme }) => {
  if (!selectedTender.submission_deadline) return null;

  const deadline = dayjs(selectedTender.submission_deadline);
  const now = dayjs();
  const isExpired = deadline.isBefore(now);

  const totalDays = 30;
  const daysRemaining = deadline.diff(now, 'day', true);
  const progress = isExpired ? 100 : Math.max(0, Math.min(100, ((totalDays - daysRemaining) / totalDays) * 100));

  const getProgressColor = (progress: number): string => {
    if (isExpired) return '#c62828';
    const normalizedProgress = progress / 100;
    const r = Math.round(20 + (198 - 20) * normalizedProgress);
    const g = Math.round(184 + (40 - 184) * normalizedProgress);
    const b = Math.round(166 + (40 - 166) * normalizedProgress);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const percentage = Math.round(100 - progress);

  return (
    <div style={{
      position: 'relative',
      marginTop: 0,
      height: 40,
      borderRadius: '0 0 8px 8px',
      overflow: 'hidden',
      background: currentTheme === 'dark' ? '#0a5348' : '#ccfbf1',
    }}>
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        height: '100%',
        width: `${progress}%`,
        background: getProgressColor(progress),
        transition: 'all 0.5s ease',
      }} />
      <div style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        padding: '0 32px',
        zIndex: 1,
      }}>
        <Text style={{
          color: 'white',
          fontWeight: 600,
          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
        }}>
          {isExpired
            ? `Дедлайн истек ${now.diff(deadline, 'day')} дней назад`
            : `До дедлайна осталось ${Math.ceil(daysRemaining)} дней`
          }
        </Text>
        <Text style={{
          color: 'white',
          fontWeight: 600,
          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
        }}>
          Дедлайн: {deadline.format('DD MMMM YYYY, HH:mm')}
        </Text>
        <Text style={{
          color: 'white',
          fontWeight: 600,
          textShadow: '0 1px 2px rgba(0,0,0,0.5)'
        }}>
          {isExpired ? '0%' : `${percentage}%`}
        </Text>
      </div>
    </div>
  );
};
