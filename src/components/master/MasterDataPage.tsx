import React, { useState, useEffect } from 'react';
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
  Search,
  ExternalLink,
  Zap,
  TrendingUp,
  X,
  Layers,
} from 'lucide-react';
import {
  RateCardTable,
  DieselPriceRecord,
  ZoneMappingRule,
  StandardTruckType,
} from '../../types';
import { fetchLiveOilPrices, LiveOilProduct } from '../../services/pttService';

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
  const [activeTab, setActiveTab] = useState<'diesel' | 'rateCard' | 'zone'>('diesel');
  const [selectedTruck, setSelectedTruck] = useState<StandardTruckType>('4W');
  const [selectedBracketKey, setSelectedBracketKey] = useState<string>('c_30_32');

  // Real-time API state
  const [liveProducts, setLiveProducts] = useState<LiveOilProduct[]>([]);
  const [liveRemark, setLiveRemark] = useState('');
  const [isLoadingLiveApi, setIsLoadingLiveApi] = useState(false);
  const [showIframeWidget, setShowIframeWidget] = useState(true);

  // Diesel CRUD States
  const [searchDiesel, setSearchDiesel] = useState('');
  const [newDieselDate, setNewDieselDate] = useState(() => {
    const today = new Date();
    return `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  });
  const [newDieselPrice, setNewDieselPrice] = useState('42.19');
  const [newDieselSource, setNewDieselSource] = useState('Bangchak / PTT Live');

  // Diesel Edit Modal State
  const [editingDiesel, setEditingDiesel] = useState<DieselPriceRecord | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  const [editDateValue, setEditDateValue] = useState('');
  const [editSourceValue, setEditSourceValue] = useState('');

  // Rate Card cell edit state
  const [editingRateCell, setEditingRateCell] = useState<{ rowId: string; bracketKey: string } | null>(null);
  const [editingRateVal, setEditingRateVal] = useState('');

  // Zone Mapping Form State
  const [newZoneRaw, setNewZoneRaw] = useState('');
  const [newZoneProv, setNewZoneProv] = useState('');
  const [newZoneTarget, setNewZoneTarget] = useState('');
  const [editingZoneRule, setEditingZoneRule] = useState<ZoneMappingRule | null>(null);

  // Fetch real-time oil prices on component mount
  useEffect(() => {
    handleLoadLivePrices();
  }, []);

  const handleLoadLivePrices = async () => {
    setIsLoadingLiveApi(true);
    try {
      const data = await fetchLiveOilPrices();
      if (data.products && data.products.length > 0) {
        setLiveProducts(data.products);
        setLiveRemark(data.effectiveText || '');
        if (data.primaryDieselPrice) {
          setNewDieselPrice(String(data.primaryDieselPrice));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLiveApi(false);
    }
  };

  // Add a specific live product to the Diesel Database
  const handleApplyLiveProductToDb = (product: LiveOilProduct) => {
    const today = new Date();
    const dateFormatted = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    const newRecord: DieselPriceRecord = {
      date: dateFormatted,
      price: product.priceToday,
      source: `Bangchak ${product.name} (Live API)`,
      updatedAt: new Date().toISOString(),
    };

    // Update or prepend
    const existsIdx = dieselPrices.findIndex((d) => d.date === dateFormatted);
    if (existsIdx >= 0) {
      const updated = [...dieselPrices];
      updated[existsIdx] = newRecord;
      onUpdateDieselPrices(updated);
    } else {
      onUpdateDieselPrices([newRecord, ...dieselPrices]);
    }
  };

  // 1. Add Diesel Record
  const handleAddDiesel = () => {
    if (!newDieselDate.trim() || !newDieselPrice.trim()) return;
    const priceNum = parseFloat(newDieselPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const newRecord: DieselPriceRecord = {
      date: newDieselDate.trim(),
      price: priceNum,
      source: newDieselSource.trim() || 'บันทึกด้วยตนเอง (Manual)',
      updatedAt: new Date().toISOString(),
    };

    // Check if date already exists
    const existingIndex = dieselPrices.findIndex((d) => d.date === newRecord.date);
    if (existingIndex >= 0) {
      const updated = [...dieselPrices];
      updated[existingIndex] = newRecord;
      onUpdateDieselPrices(updated);
    } else {
      onUpdateDieselPrices([newRecord, ...dieselPrices]);
    }

    setNewDieselPrice('');
  };

  // 2. Delete Diesel Record
  const handleDeleteDiesel = (date: string) => {
    if (window.confirm(`ยืนยันการลบข้อมูลราคาน้ำมันวันที่ "${date}" หรือไม่?`)) {
      onUpdateDieselPrices(dieselPrices.filter((d) => d.date !== date));
    }
  };

  // 3. Edit Diesel Record
  const handleOpenEditDiesel = (record: DieselPriceRecord) => {
    setEditingDiesel(record);
    setEditDateValue(record.date);
    setEditPriceValue(String(record.price));
    setEditSourceValue(record.source || '');
  };

  const handleSaveEditDiesel = () => {
    if (!editingDiesel || !editPriceValue) return;
    const p = parseFloat(editPriceValue);
    if (isNaN(p) || p <= 0) return;

    const updated = dieselPrices.map((item) => {
      if (item.date === editingDiesel.date) {
        return {
          ...item,
          date: editDateValue.trim(),
          price: p,
          source: editSourceValue.trim(),
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    onUpdateDieselPrices(updated);
    setEditingDiesel(null);
  };

  // Rate card save
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
    setEditingRateCell(null);
  };

  // Zone Mapping CRUD
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

  // Filter diesel list
  const filteredDiesel = dieselPrices.filter((d) => {
    if (!searchDiesel.trim()) return true;
    const q = searchDiesel.toLowerCase();
    return d.date.toLowerCase().includes(q) || (d.source || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
              REAL-TIME OIL PRICE & MASTER DATA
            </span>
            <span className="text-xs text-slate-400">ระบบจัดการฐานข้อมูลหลัก</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            จัดการข้อมูลหลักของระบบ (Master Data Management)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ดึงราคา API เรียลไทม์ พร้อมช่องราคาน้ำมันบางจาก (iFrame), เพิ่ม ลบ แก้ไข ข้อมูลราคาน้ำมัน, Rate Card และโซนปลายทาง
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('diesel')}
          className={`pb-3 px-5 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'diesel'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Fuel className="w-4 h-4" />
          <span>⛽ ราคาน้ำมันเรียลไทม์ & ฐานข้อมูลดีเซล ({dieselPrices.length})</span>
        </button>

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

      {/* TAB 1: DIESEL REAL-TIME & CRUD */}
      {activeTab === 'diesel' && (
        <div className="space-y-6">
          {/* Real-time Bangchak API & Widgets Section */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    ราคาน้ำมันเรียลไทม์ (Live Bangchak & PTT Oil Price API)
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      LIVE ONLINE
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {liveRemark || 'ดึงราคาขายปลีกมาตรฐาน กทม. และปริมณฑล'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadLivePrices}
                  disabled={isLoadingLiveApi}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLiveApi ? 'animate-spin' : ''}`} />
                  ดึงราคา API สด
                </button>
                <button
                  onClick={() => setShowIframeWidget(!showIframeWidget)}
                  className={`px-3.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    showIframeWidget
                      ? 'bg-amber-50 dark:bg-amber-950 border-amber-300 text-amber-800 dark:text-amber-200'
                      : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  {showIframeWidget ? 'ซ่อนวิดเจ็ต iframe' : 'แสดงช่องราคาน้ำมัน (iframe)'}
                </button>
              </div>
            </div>

            {/* Live API Cards for Diesel & Fuel Types */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
              {liveProducts.map((p, idx) => {
                const isSelectedDiesel = p.name.includes('ดีเซล') || p.name.includes('Diesel');
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSelectedDiesel
                        ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                        : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <span className="font-semibold text-xs text-slate-800 dark:text-white line-clamp-1">
                        {p.name}
                      </span>
                      {isSelectedDiesel && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
                          DIESEL
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                        ฿{p.priceToday.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500">฿/L</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        วานนี้: ฿{p.priceYesterday.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleApplyLiveProductToDb(p)}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                        title="นำราคานี้ไปบันทึกเป็นราคาน้ำมันในฐานข้อมูล"
                      >
                        <Plus className="w-3 h-3" />
                        ใช้ราคานี้
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Embedded Official Bangchak Widget (As explicitly requested by user) */}
          {showIframeWidget && (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                    ช่องราคาน้ำมันเรียลไทม์ (Bangchak Official Widget IFrame)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">
                  https://oil-price.bangchak.co.th/BcpOilPrice1/th
                </span>
              </div>

              <div className="flex flex-col lg:flex-row items-center justify-center gap-6 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                <div className="shadow-lg rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white">
                  {/* Exact iframe requested by user */}
                  <iframe
                    width="320"
                    height="875"
                    src="https://oil-price.bangchak.co.th/BcpOilPrice1/th"
                    frameBorder="0"
                    title="Bangchak Oil Price Realtime"
                    className="max-w-full"
                  />
                </div>

                <div className="max-w-sm text-xs space-y-3 text-slate-600 dark:text-slate-300">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <h5 className="font-bold text-emerald-900 dark:text-emerald-100 mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      เชื่อมต่อ Widget เรียลไทม์สำเร็จ
                    </h5>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-200 leading-relaxed">
                      กล่องแสดงราคาน้ำมันด้านซ้ายดึงตรงจากเซิร์ฟเวอร์บางจากแบบเรียลไทม์
                      สามารถดูราคาล่าสุดและกดปุ่มด้านบนเพื่อบันทึกราคาดีเซลเข้าสู่ฐานข้อมูลระบบได้ทันที
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <h5 className="font-bold text-blue-900 dark:text-blue-100 mb-1">
                      💡 คำแนะนำการใช้งาน
                    </h5>
                    <ul className="list-disc list-inside text-[11px] text-blue-800 dark:text-blue-200 space-y-1">
                      <li>ระบบรองรับทั้งการดึงอัตโนมัติ และการกรอกราคาน้ำมันด้วยตนเอง</li>
                      <li>สามารถแก้ไขและลบประวัติราคาน้ำมันย้อนหลังในตารางด้านล่างได้ตลอดเวลา</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DIESEL CRUD FORM: เพิ่มราคาน้ำมัน (Add New Record) */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 dark:text-white text-xs flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                เพิ่มราคาน้ำมันประจำวัน (Add Diesel Price):
              </h4>
              <span className="text-[11px] text-slate-400">กรอกเองหรือปรับปรุงราคาปัจจุบัน</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">วันที่ (Date):</label>
                <input
                  type="text"
                  placeholder="เช่น 8/10/2026"
                  value={newDieselDate}
                  onChange={(e) => setNewDieselDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">ราคาดีเซล (THB/L):</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="เช่น 42.19"
                  value={newDieselPrice}
                  onChange={(e) => setNewDieselPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">แหล่งที่มา / หมายเหตุ:</label>
                <input
                  type="text"
                  placeholder="เช่น PTT / Bangchak"
                  value={newDieselSource}
                  onChange={(e) => setNewDieselSource(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAddDiesel}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  บันทึกราคาใหม่
                </button>
              </div>
            </div>
          </div>

          {/* DIESEL TABLE: แสดงรายการ, ค้นหา, แก้ไข, ลบ (View, Search, Edit, Delete) */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden space-y-3">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-500" />
                  ตารางฐานข้อมูลราคาน้ำมันดีเซล ({filteredDiesel.length} รายการ)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  สามารถกดปุ่ม <strong>แก้ไข</strong> หรือ <strong>ลบ</strong> รายการในตารางได้
                </p>
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหาวันที่..."
                  value={searchDiesel}
                  onChange={(e) => setSearchDiesel(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white text-xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
                  <tr>
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">วันที่ (Date)</th>
                    <th className="py-2.5 px-4 text-right">ราคาดีเซล (THB/L)</th>
                    <th className="py-2.5 px-4">แหล่งที่มา (Source)</th>
                    <th className="py-2.5 px-4 text-center">จัดการ (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                  {filteredDiesel.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        ไม่พบข้อมูลราคาน้ำมันที่ตรงกับการค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredDiesel.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                          {row.date}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                          ฿{row.price.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{row.source || 'PTT / Bangchak'}</td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEditDiesel(row)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition-colors"
                              title="แก้ไขรายการนี้"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteDiesel(row.date)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 rounded transition-colors"
                              title="ลบรายการนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* EDIT DIESEL MODAL */}
          {editingDiesel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                    แก้ไขข้อมูลราคาน้ำมัน
                  </h3>
                  <button
                    onClick={() => setEditingDiesel(null)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3.5 py-4 text-xs">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">วันที่ (Date):</label>
                    <input
                      type="text"
                      value={editDateValue}
                      onChange={(e) => setEditDateValue(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">
                      ราคาดีเซล (THB/L):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editPriceValue}
                      onChange={(e) => setEditPriceValue(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">แหล่งที่มา:</label>
                    <input
                      type="text"
                      value={editSourceValue}
                      onChange={(e) => setEditSourceValue(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => setEditingDiesel(null)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleSaveEditDiesel}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    บันทึกการแก้ไข
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RATE CARDS */}
      {activeTab === 'rateCard' && (
        <div className="space-y-4">
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
                          editingRateCell?.rowId === row.id && editingRateCell?.bracketKey === b.key;
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
                                  value={editingRateVal}
                                  onChange={(e) => setEditingRateVal(e.target.value)}
                                  className="w-20 px-1.5 py-0.5 text-right border border-blue-500 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveRateCell(row.id, b.key, parseFloat(editingRateVal) || currentVal);
                                    }
                                    if (e.key === 'Escape') setEditingRateCell(null);
                                  }}
                                />
                                <button
                                  onClick={() =>
                                    handleSaveRateCell(
                                      row.id,
                                      b.key,
                                      parseFloat(editingRateVal) || currentVal
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
                                  setEditingRateCell({ rowId: row.id, bracketKey: b.key });
                                  setEditingRateVal(String(currentVal));
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
                            setEditingRateCell({ rowId: row.id, bracketKey: selectedBracketKey });
                            setEditingRateVal(String(row.rates[selectedBracketKey] || 0));
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

      {/* TAB 3: ZONE MAPPING */}
      {activeTab === 'zone' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              การจับคู่โซนปลายทาง (Zone & Location Mapping) ({zoneMappings.length} กฎ)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              จับคู่คำสำคัญจาก Delivery District / Province / Zone ใน Raw Data ไปยังแถวของ Rate Card
            </p>
          </div>

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

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">
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
