import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Clipboard, 
  FileText, 
  Sparkles, 
  Loader2, 
  X, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Trash2,
  PlusCircle,
  Layers
} from 'lucide-react';
import { DateInputWithCalendar } from './DateInputWithCalendar';

interface UploadZoneProps {
  onExtractImages: (images: string[], defaultDate: string, append?: boolean) => Promise<boolean>;
  onExtractRawText: (text: string, defaultDate: string, append?: boolean) => void;
  isLoading: boolean;
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  onClearAll?: () => void;
  hasExtractedItems?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onExtractImages,
  onExtractRawText,
  isLoading,
  selectedDate,
  onDateChange,
  onClearAll,
  hasExtractedItems,
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [pastedText, setPastedText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [appendMode, setAppendMode] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [lastExtractedCount, setLastExtractedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress and resize high-resolution prints so upload and AI processing is ultra-fast
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 2048;
          if (img.width > maxDim || img.height > maxDim) {
            const canvas = document.createElement('canvas');
            let w = img.width;
            let h = img.height;
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', 0.92));
              return;
            }
          }
          resolve(dataUrl);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  // Global Ctrl+V listener so the user can literally screenshot and hit Ctrl+V
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // If user is focused on a textarea or input, let standard text paste happen
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'TEXTAREA' || (activeEl.tagName === 'INPUT' && (activeEl as HTMLInputElement).type === 'text'))) {
        return;
      }

      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        const imageFiles: File[] = [];

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              imageFiles.push(blob);
            }
          }
        }

        if (imageFiles.length > 0) {
          e.preventDefault();
          setActiveTab('image');
          setIsCompressing(true);
          try {
            const processed = await Promise.all(imageFiles.map(processImageFile));
            setUploadedImages(prev => [...prev, ...processed]);
          } finally {
            setIsCompressing(false);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const processFiles = async (files: FileList) => {
    const validImageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validImageFiles.length === 0) return;

    setIsCompressing(true);
    try {
      const processed = await Promise.all(validImageFiles.map(processImageFile));
      setUploadedImages(prev => [...prev, ...processed]);
    } finally {
      setIsCompressing(false);
      // Reset input value so selecting the same or another file always triggers onChange
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearStaged = () => {
    setUploadedImages([]);
    setPastedText('');
    setLastExtractedCount(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTriggerExtract = async () => {
    if (activeTab === 'image' && uploadedImages.length > 0) {
      const imageCount = uploadedImages.length;
      const success = await onExtractImages(uploadedImages, selectedDate, appendMode);
      if (success) {
        setLastExtractedCount(imageCount);
        // Clear staged images after successful extraction so the dropzone is immediately ready for next print!
        setUploadedImages([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } else if (activeTab === 'text' && pastedText.trim()) {
      onExtractRawText(pastedText, selectedDate, appendMode);
      setPastedText('');
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Decorative subtle backdrop highlight */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header controls: Tab switcher + Date selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              id="tab-upload-image"
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'image'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Print da Tela ({uploadedImages.length})</span>
            </button>

            <button
              id="tab-upload-text"
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'text'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Colar Texto Bruto</span>
            </button>
          </div>

          <button
            onClick={() => setShowTips(!showTips)}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
            title="Ver regras de extração do padrão Excel"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Date Selector with Calendar + Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Data do Registro:
            </span>
            <DateInputWithCalendar
              value={selectedDate}
              onChange={onDateChange}
              placeholder="DD/MM/AAAA"
            />
          </div>

          {(uploadedImages.length > 0 || pastedText.length > 0) && (
            <button
              type="button"
              onClick={handleClearStaged}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition"
              title="Limpar imagens/texto selecionados"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Limpar Seleção</span>
            </button>
          )}

          {hasExtractedItems && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition shadow-sm"
              title="Limpar todos os dados extraídos para subir novo print"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nova Extração</span>
            </button>
          )}
        </div>
      </div>

      {/* Success banner after an extraction */}
      {lastExtractedCount !== null && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Extração concluída com sucesso!</strong> Os veículos foram formatados e estão na tabela abaixo prontos para copiar para o Excel.
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setLastExtractedCount(null)}
              className="text-slate-400 hover:text-slate-200 text-xs p-1"
              title="Dispensar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Extraction tips accordion */}
      {showTips && (
        <div className="mb-4 p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 text-xs text-slate-300 grid sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Inversão de Placas:</strong> Placas invertidas da telemetria (ex: <span className="font-mono text-emerald-300">5A80-HBG</span>) viram <span className="font-mono text-emerald-300">HBG-5A80</span>.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Detecção de Cores:</strong> Linhas verdes = <strong className="text-emerald-400">CARREGADO</strong> | Linhas cinzas = <strong className="text-slate-400">VAZIO</strong>.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Coluna Observação:</strong> Fica em branco no padrão Excel para você preencher horários manualmente.
            </div>
          </div>
        </div>
      )}

      {/* Image upload area */}
      {activeTab === 'image' && (
        <div>
          <div
            id="dropzone-area"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition ${
              dragActive 
                ? 'border-emerald-500 bg-emerald-500/10' 
                : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Upload className="w-6 h-6" />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Clique para selecionar ou arraste o print da telemetria aqui
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Dica de ouro: você também pode apenas dar <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">Ctrl + V</kbd> direto após capturar o print!
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Formatos suportados: PNG, JPG, WEBP, Print do Windows/Mac</span>
              </div>
            </div>
          </div>

          {/* Thumbnails of uploaded images */}
          {uploadedImages.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">
                  {uploadedImages.length} {uploadedImages.length === 1 ? 'imagem anexada' : 'imagens anexadas'}:
                </span>
                <button
                  onClick={() => setUploadedImages([])}
                  className="text-xs text-rose-400 hover:text-rose-300"
                >
                  Remover todas
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {uploadedImages.map((img, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 w-28 h-20">
                    <img src={img} alt={`Print ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/90 text-slate-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      title="Remover imagem"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-slate-900/80 text-[10px] text-slate-300 font-mono">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Raw text paste area */}
      {activeTab === 'text' && (
        <div>
          <label htmlFor="textarea-raw-text" className="block text-xs font-medium text-slate-300 mb-1.5">
            Cole as linhas de texto extraídas da telemetria:
          </label>
          <textarea
            id="textarea-raw-text"
            rows={6}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`Exemplo:
04-Em Viagem OP LS -
CLAYTON JACOB DE OLIVEIRA
5A80-HBG
264607

24-Fim Viag ... OP RODOTREM
MAYCKDIEL ARAUJO DOS SANTOS
4B04-SIT R ...`}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition resize-y"
          />
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
            <span>O sistema reverterá automaticamente as placas e identificará o status.</span>
            {pastedText && (
              <button
                onClick={() => setPastedText('')}
                className="text-slate-400 hover:text-slate-200"
              >
                Limpar texto
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action footer */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Extração inteligente com visão computacional para frotas</span>
          </div>

          {isCompressing && (
            <div className="flex items-center gap-1 text-amber-300 font-medium animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Otimizando imagem para leitura rápida...</span>
            </div>
          )}

          {hasExtractedItems && (
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-slate-700">
              <input
                type="checkbox"
                checked={appendMode}
                onChange={(e) => setAppendMode(e.target.checked)}
                className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-900"
              />
              <span>Acrescentar aos dados atuais (em vez de substituir)</span>
            </label>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(uploadedImages.length > 0 || pastedText) && (
            <button
              type="button"
              onClick={handleClearStaged}
              disabled={isLoading}
              className="px-3.5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
            >
              Limpar Seleção
            </button>
          )}

          <button
            id="btn-trigger-extraction"
            onClick={handleTriggerExtract}
            disabled={isLoading || isCompressing || (activeTab === 'image' && uploadedImages.length === 0) || (activeTab === 'text' && !pastedText.trim())}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white transition shadow-lg ${
              isLoading || isCompressing || (activeTab === 'image' && uploadedImages.length === 0) || (activeTab === 'text' && !pastedText.trim())
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-emerald-950/40 border border-emerald-400/30'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Analisando print e extraindo veículos...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {activeTab === 'image'
                    ? `Extrair do Print (${uploadedImages.length} ${uploadedImages.length === 1 ? 'imagem' : 'imagens'})`
                    : 'Processar Linhas de Texto'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
