import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { dmyToYmd, ymdToDmy, getTodayDmy, getYesterdayDmy } from '../utils/dateUtils';

interface CustomCalendarProps {
  value: string; // DD/MM/YYYY
  onChange: (dmy: string) => void;
  onClose?: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const CustomCalendar: React.FC<CustomCalendarProps> = ({
  value,
  onChange,
  onClose,
}) => {
  // Parse initial date or default to now
  const parsedDate = (() => {
    if (value) {
      const parts = value.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const date = new Date(y, m, d);
        if (!isNaN(date.getTime())) return date;
      }
    }
    return new Date();
  })();

  const [viewYear, setViewYear] = useState(parsedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate.getMonth());

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Days in current view month
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const handleSelectDay = (day: number) => {
    const dStr = String(day).padStart(2, '0');
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dmy = `${dStr}/${mStr}/${viewYear}`;
    onChange(dmy);
  };

  // Quick preset helper
  const handlePreset = (dmy: string) => {
    onChange(dmy);
    const parts = dmy.split('/');
    if (parts.length === 3) {
      setViewMonth(parseInt(parts[1], 10) - 1);
      setViewYear(parseInt(parts[2], 10));
    }
  };

  const isCurrentDay = (day: number) => {
    const dStr = String(day).padStart(2, '0');
    const mStr = String(viewMonth + 1).padStart(2, '0');
    return `${dStr}/${mStr}/${viewYear}` === value;
  };

  const isToday = (day: number) => {
    const now = new Date();
    return (
      now.getDate() === day &&
      now.getMonth() === viewMonth &&
      now.getFullYear() === viewYear
    );
  };

  // Native HTML date picker sync
  const ymdValue = dmyToYmd(value);

  return (
    <div className="bg-slate-900 border border-slate-700/90 rounded-xl p-3.5 shadow-2xl w-72 text-slate-200 select-none">
      {/* Quick shortcuts: Hoje, Ontem */}
      <div className="flex items-center justify-between gap-1.5 pb-2.5 mb-2.5 border-b border-slate-800 text-xs">
        <span className="text-[11px] text-slate-400 font-medium">Atalhos:</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handlePreset(getTodayDmy())}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-[11px] font-medium transition"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => handlePreset(getYesterdayDmy())}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-[11px] font-medium transition"
          >
            Ontem (Pernoite)
          </button>
        </div>
      </div>

      {/* Month / Year header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Mês anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-xs font-bold text-white flex items-center gap-1">
          <span>{MONTH_NAMES[viewMonth]}</span>
          <span className="text-emerald-400">{viewYear}</span>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Próximo mês"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAYS.map((wd, i) => (
          <div key={i} className="text-[10px] font-bold text-slate-500">
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {/* Empty slots before day 1 */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => {
          const prevDay = daysInPrevMonth - firstDayOfWeek + i + 1;
          return (
            <div key={`prev-${i}`} className="text-[11px] py-1 text-slate-700 font-mono">
              {prevDay}
            </div>
          );
        })}

        {/* Days of current month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const selected = isCurrentDay(day);
          const today = isToday(day);

          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={() => handleSelectDay(day)}
              className={`text-xs py-1 rounded-md font-mono transition font-medium relative ${
                selected
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950'
                  : today
                  ? 'bg-slate-800 text-emerald-300 font-bold border border-emerald-500/40 hover:bg-slate-700'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {day}
              {today && !selected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom direct native date input support */}
      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Selecionado: <strong className="text-white font-mono">{value}</strong></span>
        </div>

        {/* Native browser picker for quick keyboard entry */}
        <input
          type="date"
          value={ymdValue}
          onChange={(e) => {
            if (e.target.value) {
              onChange(ymdToDmy(e.target.value));
            }
          }}
          className="w-7 h-7 opacity-0 absolute cursor-pointer"
          title="Abrir seletor de data do sistema"
        />
      </div>
    </div>
  );
};
