import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, Check, ChevronDown, X, Clock, CalendarDays } from 'lucide-react';
import { CustomCalendar } from './CustomCalendar';
import { dmyToYmd, ymdToDmy, getTodayDmy, getYesterdayDmy, isValidDmy } from '../utils/dateUtils';

interface ApplyDatePopoverProps {
  currentDate: string;
  totalItems: number;
  filteredCount: number;
  onApplyDate: (newDate: string, onlyFiltered?: boolean) => void;
}

export const ApplyDatePopover: React.FC<ApplyDatePopoverProps> = ({
  currentDate,
  totalItems,
  filteredCount,
  onApplyDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(currentDate || getTodayDmy());
  const [applyOption, setApplyOption] = useState<'all' | 'filtered'>('all');
  const [justApplied, setJustApplied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Keep selectedDate in sync if currentDate prop changes
  useEffect(() => {
    if (currentDate) {
      setSelectedDate(currentDate);
    }
  }, [currentDate]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
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

  const handleConfirmApply = () => {
    if (!isValidDmy(selectedDate)) {
      alert('Por favor, informe uma data válida no formato DD/MM/AAAA');
      return;
    }

    onApplyDate(selectedDate, applyOption === 'filtered');
    setJustApplied(true);
    setTimeout(() => {
      setJustApplied(false);
      setIsOpen(false);
    }, 1200);
  };

  const hasFilterActive = filteredCount < totalItems;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        id="btn-open-apply-date-calendar"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow-sm ${
          isOpen
            ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-500/30'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600'
        }`}
        title="Abrir calendário para escolher e aplicar data específica em lote"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
        <span>Aplicar Data: <strong className="font-mono text-emerald-300">{selectedDate}</strong></span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-slate-400'}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 sm:right-0 mt-2 z-50 animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-[320px] text-slate-200 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Escolher Data no Calendário</h4>
                  <p className="text-[11px] text-slate-400">Selecione o dia específico do pernoite</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Manual input + Native picker button */}
            <div className="mb-3">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Data Selecionada (DD/MM/AAAA):
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="input-apply-date-manual"
                  type="text"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-center font-bold focus:outline-none focus:border-emerald-500"
                />

                {/* Browser native date picker button */}
                <div className="relative">
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 flex items-center gap-1"
                    title="Usar calendário do sistema"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nativo</span>
                  </button>
                  <input
                    type="date"
                    value={dmyToYmd(selectedDate)}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedDate(ymdToDmy(e.target.value));
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>
            </div>

            {/* Custom Interactive Calendar */}
            <div className="flex justify-center mb-3">
              <CustomCalendar
                value={selectedDate}
                onChange={(newDmy) => setSelectedDate(newDmy)}
              />
            </div>

            {/* Target scope selection if filters are applied */}
            {hasFilterActive && (
              <div className="mb-3 p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px]">
                <span className="text-slate-400 block mb-1 font-semibold">Onde aplicar:</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="apply-scope"
                      checked={applyOption === 'all'}
                      onChange={() => setApplyOption('all')}
                      className="text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Todos ({totalItems})</span>
                  </label>
                  <label className="flex items-center gap-1 text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="apply-scope"
                      checked={applyOption === 'filtered'}
                      onChange={() => setApplyOption('filtered')}
                      className="text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Filtrados ({filteredCount})</span>
                  </label>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancelar
              </button>

              <button
                id="btn-confirm-apply-date"
                type="button"
                onClick={handleConfirmApply}
                disabled={justApplied}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-md ${
                  justApplied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'
                }`}
              >
                {justApplied ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Aplicado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>
                      Aplicar {selectedDate} ({applyOption === 'filtered' ? filteredCount : totalItems})
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
