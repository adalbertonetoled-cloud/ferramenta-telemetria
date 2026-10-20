import React from 'react';
import { RotateCcw, AlertTriangle, X, Sparkles, ClipboardCopy } from 'lucide-react';

interface ConfirmClearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemCount: number;
  onQuickCopy?: () => void;
}

export const ConfirmClearModal: React.FC<ConfirmClearModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemCount,
  onQuickCopy,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle accent glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close icon button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Nova Extração / Limpar Tela
            </h3>
            <p className="text-xs text-slate-400">
              Preparar tela para envio de um novo print
            </p>
          </div>
        </div>

        {/* Body Message */}
        <div className="space-y-3 text-xs text-slate-300 mb-6">
          <p>
            Deseja limpar todos os <strong className="text-white font-semibold">{itemCount} veículos</strong> atualmente listados e as imagens anexadas?
          </p>
          <p className="text-slate-400">
            A tela voltará ao estado inicial, pronta para você subir uma nova imagem de telemetria e gerar uma nova planilha.
          </p>

          {itemCount > 0 && onQuickCopy && (
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400">
                Ainda não colou no Excel?
              </span>
              <button
                type="button"
                onClick={() => {
                  onQuickCopy();
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition"
              >
                <ClipboardCopy className="w-3 h-3 text-emerald-400" />
                Copiar dados agora
              </button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 active:scale-95 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sim, Limpar para Nova Extração</span>
          </button>
        </div>
      </div>
    </div>
  );
};
