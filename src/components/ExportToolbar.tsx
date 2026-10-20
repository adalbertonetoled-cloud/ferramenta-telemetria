import React, { useState } from 'react';
import { 
  ClipboardCopy, 
  Check, 
  Download, 
  FileSpreadsheet, 
  Layers, 
  Table, 
  ChevronDown,
  Info,
  RotateCcw
} from 'lucide-react';
import { ExtractedPernoiteItem } from '../types';
import { 
  formatForExcelClipboard, 
  generateCsvContent, 
  generateExcelXml 
} from '../utils/plateFormatter';

interface ExportToolbarProps {
  items: ExtractedPernoiteItem[];
  onClearAll?: () => void;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({ items, onClearAll }) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleCopy = (withHeaders: boolean, withObs: boolean, label: string) => {
    if (items.length === 0) return;
    const text = formatForExcelClipboard(items, withHeaders, withObs);
    navigator.clipboard.writeText(text);
    setCopiedType(label);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyPlatesDrivers = () => {
    if (items.length === 0) return;
    const text = items.map(i => `${i.placa}\t${i.motorista}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedType('placas-motoristas');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleDownloadCsv = () => {
    if (items.length === 0) return;
    const csvContent = generateCsvContent(items);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pernoite_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = () => {
    if (items.length === 0) return;
    const xmlContent = generateExcelXml(items);
    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pernoite_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (items.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Pronto para colar no Excel ({items.length} veículos organizados)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Basta clicar no botão abaixo e pressionar <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono">Ctrl + V</kbd> na sua planilha. A coluna de Observação já vai alinhada!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Main Primary Button: Copy for Excel matching Columns A-F */}
          <button
            id="btn-copy-excel-standard"
            onClick={() => handleCopy(false, true, 'excel-standard')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition"
            title="Copia os dados com a coluna de observação em branco para colar na coluna A do Excel"
          >
            {copiedType === 'excel-standard' ? (
              <>
                <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                <span>Copiado com Sucesso!</span>
              </>
            ) : (
              <>
                <ClipboardCopy className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>Copiar para Excel (Padrão Completo)</span>
              </>
            )}
          </button>

          {/* Copy with Headers */}
          <button
            id="btn-copy-with-headers"
            onClick={() => handleCopy(true, true, 'excel-headers')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition"
            title="Copia incluindo a linha de cabeçalho: DATA, PLACA, MOTORISTA, TIPO, OBSERVAÇÃO, STATUS CARGA"
          >
            {copiedType === 'excel-headers' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Table className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Com Cabeçalhos</span>
          </button>

          {/* Quick Plates & Drivers */}
          <button
            id="btn-copy-plates-drivers"
            onClick={handleCopyPlatesDrivers}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition"
            title="Copia apenas Placa e Motorista"
          >
            {copiedType === 'placas-motoristas' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Layers className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Só Placa e Motorista</span>
          </button>

          {/* Download Excel file */}
          <button
            id="btn-download-excel"
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition"
            title="Baixar planilha formatada com linhas coloridas em verde e cinza"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Baixar .XLS</span>
          </button>

          {/* Download CSV */}
          <button
            id="btn-download-csv"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95 transition"
            title="Baixar em formato CSV compatível com Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV</span>
          </button>

          {onClearAll && (
            <button
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold active:scale-95 transition shadow-sm"
              title="Limpar tabela para fazer nova extração com outro print"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Nova Extração</span>
            </button>
          )}

          {/* Toggle text preview */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
            title="Pré-visualizar texto da área de transferência"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Copy notification toast banner */}
      {copiedType && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-emerald-300 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Dados copiados para a área de transferência!</strong> Vá até sua planilha Excel, clique na primeira célula (Coluna A) e pressione <strong>Ctrl + V</strong>.
            </span>
          </div>
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="self-end sm:self-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-rose-300 hover:text-rose-200 text-xs font-medium border border-rose-500/20 transition shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar para Novo Print</span>
            </button>
          )}
        </div>
      )}

      {/* Live Text Preview drawer */}
      {showPreview && (
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">
              Pré-visualização do conteúdo copiado (Separado por TAB para Excel):
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              6 colunas (Data, Placa, Motorista, Tipo, Obs [vazio], Status)
            </span>
          </div>
          <pre className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-40 border border-slate-800">
            {formatForExcelClipboard(items.slice(0, 5), true, true)}
            {items.length > 5 && `\n... e mais ${items.length - 5} linhas`}
          </pre>
        </div>
      )}
    </div>
  );
};
