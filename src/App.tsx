import React, { useState, useCallback } from 'react';
import { ExtractedPernoiteItem, CargoStatus, VehicleType } from './types';
import { SAMPLE_PERNOITE_ITEMS } from './data/samplePernoite';
import { parseTelemetryRawText, formatForExcelClipboard } from './utils/plateFormatter';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { PernoiteTable } from './components/PernoiteTable';
import { ExportToolbar } from './components/ExportToolbar';
import { ExcelPatternGuide } from './components/ExcelPatternGuide';
import { ConfirmClearModal } from './components/ConfirmClearModal';
import { AlertCircle, CheckCircle2, Info, Sparkles } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<ExtractedPernoiteItem[]>(SAMPLE_PERNOITE_ITEMS);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  });

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Extract from images via Gemini Vision API with automatic fallback
  const handleExtractImages = async (
    images: string[],
    defaultDate: string,
    append = false
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images,
          defaultDate,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha ao processar imagens com a IA.');
      }

      if (data.items && data.items.length > 0) {
        if (append) {
          setItems(prev => [...prev, ...data.items]);
          showNotification(
            'success',
            `+${data.items.length} veículos adicionados à lista existente! Total agora: ${items.length + data.items.length}.`
          );
        } else {
          setItems(data.items);
          showNotification(
            'success',
            `Extração concluída com sucesso! ${data.items.length} veículos foram identificados e organizados para o Excel.`
          );
        }
        return true;
      } else {
        showNotification(
          'info',
          'Nenhum veículo foi identificado na imagem. Verifique se o print está nítido e legível.'
        );
        return false;
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      showNotification('error', `Erro na extração: ${err.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Extract from raw pasted text
  const handleExtractRawText = (rawText: string, defaultDate: string, append = false) => {
    try {
      const parsed = parseTelemetryRawText(rawText, defaultDate);
      if (parsed.length > 0) {
        if (append) {
          setItems(prev => [...prev, ...parsed]);
          showNotification(
            'success',
            `+${parsed.length} veículos adicionados ao total existente!`
          );
        } else {
          setItems(parsed);
          showNotification(
            'success',
            `${parsed.length} veículos extraídos com sucesso do texto bruto!`
          );
        }
      } else {
        showNotification('info', 'Não foi possível encontrar placas ou motoristas no texto colado.');
      }
    } catch (err: any) {
      showNotification('error', `Erro ao analisar texto: ${err.message}`);
    }
  };

  const handleUpdateItem = useCallback((id: string, field: keyof ExtractedPernoiteItem, value: any) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleAddNewRow = () => {
    const newItem: ExtractedPernoiteItem = {
      id: `manual-${Date.now()}`,
      data: selectedDate,
      placa: '',
      motorista: '',
      tipo: 'CONTEINER',
      observacao: '',
      status: 'CARREGADO',
    };
    setItems(prev => [newItem, ...prev]);
  };

  const handleApplyDate = (newDate: string, targetIds?: string[]) => {
    if (targetIds && targetIds.length > 0) {
      setItems(prev => prev.map(item => (targetIds.includes(item.id) ? { ...item, data: newDate } : item)));
      showNotification('success', `Data ${newDate} aplicada com sucesso em ${targetIds.length} registros filtrados.`);
    } else {
      setItems(prev => prev.map(item => ({ ...item, data: newDate })));
      showNotification('success', `Data ${newDate} aplicada com sucesso em todos os ${items.length} registros.`);
    }
    setSelectedDate(newDate);
  };

  const handleLoadSample = () => {
    setItems(SAMPLE_PERNOITE_ITEMS);
    showNotification(
      'success',
      '17 registros do print de exemplo carregados! Você já pode testar o botão "Copiar para Excel".'
    );
  };

  const handleOpenClearModal = () => {
    if (items.length === 0) {
      showNotification('info', 'A tabela já está limpa e pronta para novos dados.');
      return;
    }
    setIsClearModalOpen(true);
  };

  const handleConfirmClear = () => {
    setItems([]);
    showNotification('info', 'Tabela limpa com sucesso! Selecione ou cole o novo print da telemetria.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickCopyBeforeClear = () => {
    if (items.length > 0) {
      const text = formatForExcelClipboard(items, false, true);
      navigator.clipboard.writeText(text);
      showNotification('success', 'Dados copiados para a área de transferência!');
    }
  };

  const loadedCount = items.filter(i => i.status === 'CARREGADO').length;
  const emptyCount = items.filter(i => i.status === 'VAZIO').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Top navigation header */}
      <Header
        itemCount={items.length}
        loadedCount={loadedCount}
        emptyCount={emptyCount}
        onLoadSample={handleLoadSample}
        onClearAll={handleOpenClearModal}
      />

      {/* Main container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Floating Notification Toast */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in duration-200 shadow-xl ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              {notification.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Upload and input section */}
        <UploadZone
          onExtractImages={handleExtractImages}
          onExtractRawText={handleExtractRawText}
          isLoading={isLoading}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onClearAll={handleOpenClearModal}
          hasExtractedItems={items.length > 0}
        />

        {/* Excel alignment guide accordion */}
        <ExcelPatternGuide />

        {/* Export toolbar with 1-click clipboard actions */}
        <ExportToolbar 
          items={items} 
          onClearAll={handleOpenClearModal}
        />

        {/* Main Pernoite interactive data table */}
        <PernoiteTable
          items={items}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onAddNewRow={handleAddNewRow}
          onApplyDate={handleApplyDate}
          currentDate={selectedDate}
          onClearAll={handleOpenClearModal}
        />
      </main>

      {/* Confirmation modal for new extraction */}
      <ConfirmClearModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
        itemCount={items.length}
        onQuickCopy={handleQuickCopyBeforeClear}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-4 text-center text-xs text-slate-500">
        <p>Extrator de Pernoite • Telemetria de Frota para Excel • Desenvolvido para máxima precisão e agilidade</p>
      </footer>
    </div>
  );
}
