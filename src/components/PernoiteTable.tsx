import React, { useState, useMemo } from 'react';
import { 
  ExtractedPernoiteItem, 
  VehicleType, 
  CargoStatus 
} from '../types';
import { 
  Search, 
  Trash2, 
  Plus, 
  ArrowUpDown, 
  Check, 
  AlertCircle,
  Truck,
  RotateCw,
  RotateCcw,
  Edit2
} from 'lucide-react';
import { ApplyDatePopover } from './ApplyDatePopover';
import { DateInputWithCalendar } from './DateInputWithCalendar';

interface PernoiteTableProps {
  items: ExtractedPernoiteItem[];
  onUpdateItem: (id: string, field: keyof ExtractedPernoiteItem, value: any) => void;
  onDeleteItem: (id: string) => void;
  onAddNewRow: () => void;
  onApplyDate: (newDate: string, targetIds?: string[]) => void;
  currentDate: string;
  onClearAll?: () => void;
}

export const PernoiteTable: React.FC<PernoiteTableProps> = ({
  items,
  onUpdateItem,
  onDeleteItem,
  onAddNewRow,
  onApplyDate,
  currentDate,
  onClearAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CARREGADO' | 'VAZIO'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | VehicleType>('ALL');

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.motorista.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.placaOriginal && item.placaOriginal.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || item.tipo === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [items, searchTerm, statusFilter, typeFilter]);

  const toggleStatus = (item: ExtractedPernoiteItem) => {
    const nextStatus: CargoStatus = item.status === 'CARREGADO' ? 'VAZIO' : 'CARREGADO';
    onUpdateItem(item.id, 'status', nextStatus);
  };

  const invertPlate = (item: ExtractedPernoiteItem) => {
    // If the user wants to manual reverse e.g. HBG-5A80 <-> 5A80-HBG
    if (item.placa.includes('-')) {
      const parts = item.placa.split('-');
      onUpdateItem(item.id, 'placa', `${parts[1]}-${parts[0]}`);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Controls Bar: Search, Filters, Add Row */}
      <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-950/40">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="search-input"
              type="text"
              placeholder="Buscar por placa ou motorista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Status Filter */}
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('CARREGADO')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                statusFilter === 'CARREGADO'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              Carregados ({items.filter(i => i.status === 'CARREGADO').length})
            </button>
            <button
              onClick={() => setStatusFilter('VAZIO')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                statusFilter === 'VAZIO'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Vazios ({items.filter(i => i.status === 'VAZIO').length})
            </button>
          </div>

          {/* Type Filter */}
          <select
            id="filter-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Todos Tipos</option>
            <option value="CONTEINER">Contêiner</option>
            <option value="LS">LS</option>
            <option value="RODOTREM">Rodotrem</option>
          </select>
        </div>

        {/* Right action buttons: Apply Date with Calendar + Add Row + Clear */}
        <div className="flex flex-wrap items-center gap-2">
          <ApplyDatePopover
            currentDate={currentDate}
            totalItems={items.length}
            filteredCount={filteredItems.length}
            onApplyDate={(newDate, onlyFiltered) => {
              if (onlyFiltered) {
                onApplyDate(newDate, filteredItems.map(i => i.id));
              } else {
                onApplyDate(newDate);
              }
            }}
          />

          <button
            id="btn-add-row"
            onClick={onAddNewRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Linha</span>
          </button>

          {items.length > 0 && onClearAll && (
            <button
              id="btn-table-clear-all"
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold shadow-sm transition active:scale-95"
              title="Limpar todos os registros para subir novo print"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Nova Extração</span>
            </button>
          )}
        </div>
      </div>

      {/* Table responsive container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-3 text-center w-12">#</th>
              <th className="py-3 px-3 w-28">DATA</th>
              <th className="py-3 px-3 w-36">PLACA (PADRÃO)</th>
              <th className="py-3 px-4 min-w-[240px]">NOME DO MOTORISTA</th>
              <th className="py-3 px-3 w-32">TIPO</th>
              <th className="py-3 px-4 min-w-[200px]">OBSERVAÇÃO (MANUAL)</th>
              <th className="py-3 px-3 text-center w-36">STATUS CARGA</th>
              <th className="py-3 px-3 text-center w-16">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Truck className="w-8 h-8 text-slate-600 stroke-[1.5]" />
                    <p className="text-sm font-medium text-slate-400">Nenhum registro encontrado</p>
                    <p className="text-xs text-slate-500">
                      Faça o upload do print acima ou clique em "Carregar Exemplo do Print" para testar.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => (
                <tr 
                  key={item.id}
                  className={`hover:bg-slate-800/40 transition group ${
                    item.status === 'CARREGADO' 
                      ? 'bg-emerald-950/10' 
                      : 'bg-slate-950/20'
                  }`}
                >
                  {/* Row index */}
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500 text-[11px]">
                    {index + 1}
                  </td>

                  {/* DATA */}
                  <td className="py-2.5 px-3">
                    <DateInputWithCalendar
                      value={item.data}
                      onChange={(newVal) => onUpdateItem(item.id, 'data', newVal)}
                      size="sm"
                      inputClassName="w-24 bg-transparent hover:bg-slate-800/60 focus:bg-slate-950 border border-transparent hover:border-slate-700 focus:border-emerald-500 rounded px-1.5 py-0.5 text-xs text-slate-200 font-mono focus:outline-none transition"
                      placeholder="DD/MM/AAAA"
                    />
                  </td>

                  {/* PLACA */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={item.placa}
                        onChange={(e) => onUpdateItem(item.id, 'placa', e.target.value.toUpperCase())}
                        className="w-24 bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500 transition"
                      />
                      <button
                        onClick={() => invertPlate(item)}
                        className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition"
                        title="Inverter partes da placa se necessário"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                    </div>
                    {item.placaOriginal && item.placaOriginal !== item.placa && (
                      <span className="text-[10px] text-slate-500 block font-mono pl-1">
                        orig: {item.placaOriginal}
                      </span>
                    )}
                  </td>

                  {/* MOTORISTA */}
                  <td className="py-2.5 px-4">
                    <input
                      type="text"
                      value={item.motorista}
                      onChange={(e) => onUpdateItem(item.id, 'motorista', e.target.value.toUpperCase())}
                      className="w-full bg-transparent hover:bg-slate-800/60 focus:bg-slate-950 border border-transparent hover:border-slate-700 focus:border-emerald-500 rounded px-2 py-1 text-xs font-medium text-slate-100 uppercase focus:outline-none transition"
                      placeholder="NOME DO MOTORISTA"
                    />
                  </td>

                  {/* TIPO */}
                  <td className="py-2.5 px-3">
                    <select
                      value={item.tipo}
                      onChange={(e) => onUpdateItem(item.id, 'tipo', e.target.value as VehicleType)}
                      className="bg-slate-950 border border-slate-700/80 rounded px-2 py-1 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
                    >
                      <option value="CONTEINER">CONTEINER</option>
                      <option value="LS">LS</option>
                      <option value="RODOTREM">RODOTREM</option>
                    </select>
                  </td>

                  {/* OBSERVAÇÃO */}
                  <td className="py-2.5 px-4">
                    <input
                      type="text"
                      value={item.observacao}
                      onChange={(e) => onUpdateItem(item.id, 'observacao', e.target.value)}
                      placeholder="Preencher manualmente..."
                      className="w-full bg-transparent hover:bg-slate-800/50 focus:bg-slate-950 border border-transparent hover:border-slate-700 focus:border-emerald-500 rounded px-2 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none transition"
                    />
                  </td>

                  {/* STATUS CARGA */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => toggleStatus(item)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm ${
                        item.status === 'CARREGADO'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-slate-700/40 text-slate-300 border border-slate-600/40 hover:bg-slate-700/60'
                      }`}
                      title="Clique para alternar entre CARREGADO (verde) e VAZIO (cinza)"
                    >
                      <span className={`w-2 h-2 rounded-full ${item.status === 'CARREGADO' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                      <span>{item.status}</span>
                    </button>
                  </td>

                  {/* AÇÕES */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Excluir este registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span>Exibindo <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong> registros</span>
          {searchTerm && <span className="text-emerald-400">(Filtrado por busca)</span>}
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Verde no print = Carregado
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400" /> Cinza no print = Vazio
          </span>
        </div>
      </div>
    </div>
  );
};
