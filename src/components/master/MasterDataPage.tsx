import React, { useState } from 'react';
import {
  Settings,
  Fuel,
  MapPin,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Truck,
  Edit2,
} from 'lucide-react';
import {
  RateCardTable,
  DieselPriceRecord,
  ZoneMappingRule,
  StandardTruckType,
} from '../../types';

interface MasterDataPageProps {
  rateCards: { [key in StandardTruckType]: RateCardTable };
  onUpdateRateCards: (newCards: { [key in StandardTruckType]: RateCardTable }) => void;
  dieselPrices: DieselPriceRecord[];
  onUpdateDieselPrices: (newList: DieselPriceRecord[]) => void;
  zoneMappings: ZoneMappingRule[];
  onUpdateZoneMappings: (newList: ZoneMappingRule[]) => void;
  onRefreshPTTPrice: () => Promise<void>;
  isRefreshingPTT: boolean;
}

export const MasterDataPage: React.FC<MasterDataPageProps> = ({
  rateCards,
  onUpdateRateCards,
  dieselPrices,
  onUpdateDieselPrices,
  zoneMappings,
  onUpdateZoneMappings,
  onRefreshPTTPrice,
  isRefreshingPTT,
}) => {
  const [activeTab, setActiveTab] = useState<'rateCard' | 'diesel' | 'zone'>('rateCard');
  const [selectedTruck, setSelectedTruck] = useState<StandardTruckType>('4W');
  const [selectedBracketKey, setSelectedBracketKey] = useState<string>('c_30_32');

  // New Diesel State
  const [newDieselDate, setNewDieselDate] = useState('');
  const [newDieselPrice, setNewDieselPrice] = useState('');

  // New Zone Rule State
  const [newZoneRaw, setNewZoneRaw] = useState('');
  const [newZoneProv, setNewZoneProv] = useState('');
  const [newZoneTarget, setNewZoneTarget] = useState('');

  // Rate Card edit state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRateValue, setEditingRateValue] = useState<string>('');

  const currentTable = rateCards[selectedTruck];

  const handleSaveRateCell = (rowId: string, bracketKey: string, val: number) => {
    const updatedRows = currentTable.rows.map((r) => {
      if (r.id === rowId) {
        return {
          ...r,
          rates: {
            ...r.rates,
            [bracketKey]: val,
          },
        };
      }
      return r;
    });

    onUpdateRateCards({
      ...rateCards,
      [selectedTruck]: {
        ...currentTable,
        rows: updatedRows,
      },
    });
    setEditingRowId(null);
  };

  const handleAddDiesel = () => {
    if (!newDieselDate || !newDieselPrice) return;
    const p = parseFloat(newDieselPrice);
    if (isNaN(p)) return;

    const newRecord: DieselPriceRecord = {
      date: newDieselDate.trim(),
      price: p,
      source: 'บันทึกด้วยตนเอง (Manual)',
      updatedAt: new Date().toISOString(),
    };

    onUpdateDieselPrices([newRecord, ...dieselPrices]);
    setNewDieselDate('');
    setNewDieselPrice('');
  };

  const handleDeleteDiesel = (date: string) => {
    onUpdateDieselPrices(dieselPrices.filter((d) => d.date !== date));
  };

  const handleAddZoneMapping = () => {
    if (!newZoneRaw || !newZoneTarget) return;
    const newRule: ZoneMappingRule = {
      id: `zm-${Date.now()}`,
      rawZoneKeyword: newZoneRaw.trim(),
      provinceKeyword: newZoneProv.trim() || undefined,
      matchedLocation: newZoneTarget.trim(),
    };

    onUpdateZoneMappings([newRule, ...zoneMappings]);
    setNewZoneRaw('');
    setNewZoneProv('');
    setNewZoneTarget('');
  };

  const handleDeleteZoneMapping = (id: string) => {
    onUpdateZoneMappings(zoneMappings.filter((z) => z.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            จัดการข้อมูลหลักของระบบ (Master Data Management)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            กำหนดตาราง Rate Card (4W/6W/10W), ฐานข้อมูลราคาน้ำมันดีเซล PTT และกฎจับคู่โซน (Zone Mapping)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('rateCard')}
          className={`pb-3 px-5 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'rateCard'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Rate Card (4W / 6W / 10W)</span>
        </button>

        <button
          onClick={() => setActiveTab('diesel')}
          className={`pb-3 px-5 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'diesel'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Fuel className="w-4 h-4" />
          <span>ฐานข้อมูลราคาน้ำมันดีเซล PTT ({dieselPrices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('zone')}
          className={`pb-3 px-5 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'zone'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>กฎการจับคู่โซน (Zone Mapping) ({zoneMappings.length})</span>
        </button>
      </div>

      {/* TAB 1: Rate Cards */}
      {activeTab === 'rateCard' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                เลือกประเภทรถ:
              </span>
              {(['4W', '6W', '10W'] as StandardTruckType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTruck(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedTruck === t
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  รถ {t}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                ไฮไลต์ช่วงน้ำมัน (Bracket B:Q):
              </span>
              <select
                value={selectedBracketKey}
                onChange={(e) => setSelectedBracketKey(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
              >
                {currentTable.brackets.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label} บาท/ลิตร
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Special note for Si Maha Phot */}
          {selectedTruck === '4W' && (
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>Logic พิเศษ:</strong> เมื่อ Truck Type = <strong>4W/Single Unit</strong> และ Zone ={' '}
                <strong>Si Maha Phot, Prachinburi</strong> เรทช่วง 30.01-32.00 ถูกตั้งค่าไว้ที่{' '}
                <span className="font-bold underline text-blue-700 dark:text-blue-300">3,280 บาท</span> ตามข้อกำหนด
              </span>
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
                  <tr>
                    <th className="py-2.5 px-3 sticky left-0 bg-slate-50 dark:bg-slate-700 z-10 shadow-xs">
                      สถานที่ปลายทาง (Location Match)
                    </th>
                    <th className="py-2.5 px-3">จังหวัด</th>
                    {currentTable.brackets.map((b) => (
                      <th
                        key={b.key}
                        className={`py-2.5 px-3 text-right ${
                          b.key === selectedBracketKey
                            ? 'bg-blue-100/70 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200 font-bold'
                            : ''
                        }`}
                      >
                        {b.label}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center">แก้ไข</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                  {currentTable.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 z-10">
                        {row.location}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{row.province}</td>

                      {currentTable.brackets.map((b) => {
                        const isSelected = b.key === selectedBracketKey;
                        const isEditingThis =
                          editingRowId === `${row.id}-${b.key}`;
                        const currentVal = row.rates[b.key] || 0;

                        return (
                          <td
                            key={b.key}
                            className={`py-2 px-3 text-right font-mono ${
                              isSelected
                                ? 'bg-blue-50/50 dark:bg-blue-950/30 font-bold text-blue-700 dark:text-blue-300'
                                : ''
                            }`}
                          >
                            {isEditingThis ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  value={editingRateValue}
                                  onChange={(e) => setEditingRateValue(e.target.value)}
                                  className="w-20 px-1.5 py-0.5 text-right border border-blue-500 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                                  autoFocus
                                />
                                <button
                                  onClick={() =>
                                    handleSaveRateCell(
                                      row.id,
                                      b.key,
                                      parseFloat(editingRateValue) || currentVal
                                    )
                                  }
                                  className="p-1 text-emerald-600 hover:text-emerald-700"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span
                                onDoubleClick={() => {
                                  setEditingRowId(`${row.id}-${b.key}`);
                                  setEditingRateValue(String(currentVal));
                                }}
                                className="cursor-pointer hover:underline"
                                title="ดับเบิ้ลคลิกเพื่อแก้ไขตัวเลขราคา"
                              >
                                {currentVal > 0 ? currentVal.toLocaleString() : '-'}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => {
                            setEditingRowId(`${row.id}-${selectedBracketKey}`);
                            setEditingRateValue(String(row.rates[selectedBracketKey] || 0));
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                          title="แก้ไขราคาแถวนี้"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PTT Diesel Price Database */}
      {activeTab === 'diesel' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-500" />
                ฐานข้อมูลราคาน้ำมันดีเซล PTT รายวัน (PTT Diesel Price Database)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                ดึงอัตโนมัติจาก PTT ผ่าน CORS Proxy (AllOrigins) หรือกรอกเพิ่มเติมด้วยตนเอง
              </p>
            </div>

            <button
              onClick={onRefreshPTTPrice}
              disabled={isRefreshingPTT}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-xs disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingPTT ? 'animate-spin' : ''}`} />
              {isRefreshingPTT ? 'กำลังดึงราคาจาก PTT...' : 'ดึงราคาน้ำมัน PTT ล่าสุด (fetchPTTPrice)'}
            </button>
          </div>

          {/* Manual Add Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <h4 className="font-semibold text-slate-800 dark:text-white mb-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" />
              เพิ่ม/แก้ไขราคาน้ำมันประจำวัน:
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="วันที่ (เช่น 1/10/2026)"
                value={newDieselDate}
                onChange={(e) => setNewDieselDate(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white w-40"
              />
              <input
                type="number"
                step="0.01"
                placeholder="ราคา (เช่น 41.50)"
                value={newDieselPrice}
                onChange={(e) => setNewDieselPrice(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white w-36"
              />
              <button
                onClick={handleAddDiesel}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                บันทึกราคาน้ำมัน
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
                  <tr>
                    <th className="py-2.5 px-4">วันที่ (Date)</th>
                    <th className="py-2.5 px-4 text-right">ราคาดีเซล (THB/L)</th>
                    <th className="py-2.5 px-4">แหล่งที่มา (Source)</th>
                    <th className="py-2.5 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                  {dieselPrices.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {row.date}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                        ฿{row.price.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{row.source || 'PTT Database'}</td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteDiesel(row.date)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Zone Mapping */}
      {activeTab === 'zone' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              การจับคู่โซนปลายทาง (Zone & Location Mapping)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              จับคู่คำสำคัญจาก Delivery District / Province / Zone ใน Raw Data ไปยังแถวของ Rate Card
            </p>
          </div>

          {/* Add Rule Form */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <h4 className="font-semibold text-slate-800 dark:text-white mb-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" />
              เพิ่มกฎการจับคู่โซนใหม่:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="คำค้นหาโซน/อำเภอ (เช่น ศรีมหาโพธิ)"
                value={newZoneRaw}
                onChange={(e) => setNewZoneRaw(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
              />
              <input
                type="text"
                placeholder="คำค้นหาจังหวัด (ถ้ามี เช่น ปราจีนบุรี)"
                value={newZoneProv}
                onChange={(e) => setNewZoneProv(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
              />
              <input
                type="text"
                placeholder="ชื่อใน Rate Card (เช่น Si Maha Phot, Prachinburi)"
                value={newZoneTarget}
                onChange={(e) => setNewZoneTarget(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
              />
              <button
                onClick={handleAddZoneMapping}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                เพิ่มกฎการจับคู่
              </button>
            </div>
          </div>

          {/* Rules Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
                  <tr>
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Delivery Zone (Raw)</th>
                    <th className="py-2.5 px-4">Province Keyword</th>
                    <th className="py-2.5 px-4 font-bold text-blue-600 dark:text-blue-400">
                      Matching Rate Card Location
                    </th>
                    <th className="py-2.5 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                  {zoneMappings.map((rule, idx) => (
                    <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-white">
                        {rule.rawZoneKeyword}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {rule.provinceKeyword || '-'}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {rule.matchedLocation}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteZoneMapping(rule.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                          title="ลบกฎนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
