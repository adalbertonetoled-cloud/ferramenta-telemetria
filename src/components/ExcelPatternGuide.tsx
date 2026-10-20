import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

export const ExcelPatternGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 transition">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:text-white transition"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Como funciona o alinhamento com a sua planilha do Excel</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 text-[11px]">
          <span>{isOpen ? 'Ocultar detalhes' : 'Ver padrão das colunas'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-300 space-y-4">
          <p className="text-slate-400 leading-relaxed">
            O aplicativo foi calibrado exatamente com base nos prints do seu monitoramento e na estrutura de colunas da sua planilha:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 font-mono text-[11px]">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] font-bold">COLUNA A</span>
              <strong className="text-emerald-400 block mt-0.5">DATA</strong>
              <span className="text-slate-400 text-[10px]">17/09/2026</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] font-bold">COLUNA B</span>
              <strong className="text-emerald-400 block mt-0.5">PLACA</strong>
              <span className="text-slate-400 text-[10px]">HBG-5A80 (desinvertida)</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] font-bold">COLUNA C</span>
              <strong className="text-emerald-400 block mt-0.5">MOTORISTA</strong>
              <span className="text-slate-400 text-[10px]">CLAYTON JACOB...</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] font-bold">COLUNA D</span>
              <strong className="text-emerald-400 block mt-0.5">TIPO</strong>
              <span className="text-slate-400 text-[10px]">LS / CONTEINER / RODO</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-950/10">
              <span className="text-emerald-500 block text-[10px] font-bold">COLUNA E (SUA)</span>
              <strong className="text-emerald-300 block mt-0.5">OBSERVAÇÃO</strong>
              <span className="text-slate-400 text-[10px]">Vazia (preenchimento manual)</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] font-bold">COLUNA F</span>
              <strong className="text-emerald-400 block mt-0.5">STATUS CARGA</strong>
              <span className="text-slate-400 text-[10px]">CARREGADO ou VAZIO</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-2.5 text-slate-400">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-normal">
              Ao clicar em <strong>"Copiar para Excel (Padrão Completo)"</strong>, os dados são transferidos com tabulações automáticas. Quando você colar na primeira coluna da sua planilha, a coluna <strong>E (Observação)</strong> ficará em branco e a coluna <strong>F (Status)</strong> receberá perfeitamente <span className="text-emerald-400 font-semibold">CARREGADO</span> ou <span className="text-slate-300 font-semibold">VAZIO</span>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
