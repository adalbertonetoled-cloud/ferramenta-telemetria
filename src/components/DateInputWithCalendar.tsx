import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { CustomCalendar } from './CustomCalendar';
import { dmyToYmd, ymdToDmy } from '../utils/dateUtils';

interface DateInputWithCalendarProps {
  value: string; // DD/MM/YYYY
  onChange: (newValue: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  size?: 'sm' | 'md';
}

export const DateInputWithCalendar: React.FC<DateInputWithCalendarProps> = ({
  value,
  onChange,
  className = '',
  inputClassName = '',
  placeholder = 'DD/MM/AAAA',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const ymd = dmyToYmd(value);

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={
          inputClassName ||
          `bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white text-center font-mono focus:outline-none focus:border-emerald-500 transition ${
            size === 'sm' ? 'w-24 text-[11px] py-0.5' : 'w-28'
          }`
        }
      />

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="ml-1 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition"
        title="Abrir calendário para selecionar data"
      >
        <CalendarIcon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 z-50 animate-in fade-in zoom-in-95 duration-150">
          <CustomCalendar
            value={value}
            onChange={(newDate) => {
              onChange(newDate);
              setIsOpen(false);
            }}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
};
