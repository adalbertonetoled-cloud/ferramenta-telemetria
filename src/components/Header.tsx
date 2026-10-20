import React from 'react';
import { Truck, Sparkles, FileSpreadsheet, RotateCcw } from 'lucide-react';

interface HeaderProps {
  itemCount: number;
  loadedCount: number;
  emptyCount: number;
  onLoadSample: () => void;
  onClearAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  itemCount,
  loadedCount,
  emptyCount,
  onLoadSample,
  onClearAll,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Extrator de Pernoite
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" /> IA Vision + Excel
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Extraia dados de telemetria dos prints para colar perfeitamente na planilha Excel
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {itemCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 mr-1">
                <span className="text-slate-300 font-medium">Total: <strong className="text-white">{itemCount}</strong></span>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400 font-medium">Carregados: <strong>{loadedCount}</strong></span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 font-medium">Vazios: <strong>{emptyCount}</strong></span>
              </div>
            )}

            <button
              id="btn-load-sample"
              onClick={onLoadSample}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95"
              title="Carregar os 17 veículos extraídos do exemplo das imagens"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Carregar Exemplo do Print</span>
            </button>

            {itemCount > 0 && (
              <button
                id="btn-clear-all"
                onClick={onClearAll}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition active:scale-95 shadow-sm"
                title="Limpar todos os registros e preparar para novo print"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Nova Extração (Limpar)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
