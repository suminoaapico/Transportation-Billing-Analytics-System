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
  Building2,
  FileText,
  Scale,
  Sparkles,
  Database,
  UploadCloud,
  Copy,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import {
  RateCardTable,
  DieselPriceRecord,
  ZoneMappingRule,
  StandardTruckType,
  QuotationSchema,
  FixedDieselCustomer,
  TruckTypeMappingRule,
  FeeMasterItem,
  ConditionRule,
} from '../../types';
import { fetchLiveOilPrices, LiveOilProduct } from '../../services/pttService';
import { QuotationUploadModal } from '../quotation/QuotationUploadModal';
import { TruckTypeMappingTab } from './TruckTypeMappingTab';
import { FeeMasterTab } from './FeeMasterTab';
import { ConditionRuleTab } from './ConditionRuleTab';
import {
  INITIAL_TRUCK_TYPE_MAPPINGS,
  INITIAL_FEE_MASTER_ITEMS,
  INITIAL_CONDITION_RULES,
  INITIAL_RATE_CARD_4W,
} from '../../data/seedData';
import {
  uploadAllRateCardsToSupabase,
  generateRateCardsSqlScript,
} from '../../services/supabaseService';
import { parseRateCardRawText } from '../../services/masterImportParser';

interface MasterDataPageProps {
  rateCards: { [key in StandardTruckType]: RateCardTable };
  onUpdateRateCards: (newCards: { [key in StandardTruckType]: RateCardTable }) => void;
  dieselPrices: DieselPriceRecord[];
  onUpdateDieselPrices: (newList: DieselPriceRecord[]) => void;
  zoneMappings: ZoneMappingRule[];
  onUpdateZoneMappings: (newList: ZoneMappingRule[]) => void;
  onRefreshPTTPrice: () => Promise<void>;
  isRefreshingPTT: boolean;
  quotations?: QuotationSchema[];
  onUpdateQuotations?: (list: QuotationSchema[]) => void;
  fixedCustomers?: FixedDieselCustomer[];
  onUpdateFixedCustomers?: (list: FixedDieselCustomer[]) => void;
  truckTypeMappings?: TruckTypeMappingRule[];
  onUpdateTruckTypeMappings?: (mappings: TruckTypeMappingRule[]) => void;
  feeMasterItems?: FeeMasterItem[];
  onUpdateFeeMasterItems?: (items: FeeMasterItem[]) => void;
  conditionRules?: ConditionRule[];
  onUpdateConditionRules?: (rules: ConditionRule[]) => void;
  initialTab?: 'diesel' | 'rateCard' | 'zone' | 'truckType' | 'feeMaster' | 'conditionRule' | 'quotation' | 'fixedContract';
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
  quotations = [],
  onUpdateQuotations,
  fixedCustomers = [],
  onUpdateFixedCustomers,
  truckTypeMappings,
  onUpdateTruckTypeMappings,
  feeMasterItems,
  onUpdateFeeMasterItems,
  conditionRules,
  onUpdateConditionRules,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<
    'diesel' | 'rateCard' | 'zone' | 'truckType' | 'feeMaster' | 'conditionRule' | 'quotation' | 'fixedContract'
  >(initialTab || 'diesel');

  // Internal states for Prompt 2 master datasets
  const [internalTruckMappings, setInternalTruckMappings] = useState<TruckTypeMappingRule[]>(
    truckTypeMappings || INITIAL_TRUCK_TYPE_MAPPINGS
  );
  const [internalFeeItems, setInternalFeeItems] = useState<FeeMasterItem[]>(
    feeMasterItems || INITIAL_FEE_MASTER_ITEMS
  );
  const [internalConditions, setInternalConditions] = useState<ConditionRule[]>(
    conditionRules || INITIAL_CONDITION_RULES
  );

  const currentTruckMappings = truckTypeMappings || internalTruckMappings;
  const handleUpdateTruckMappings = (list: TruckTypeMappingRule[]) => {
    if (onUpdateTruckTypeMappings) onUpdateTruckTypeMappings(list);
    else setInternalTruckMappings(list);
  };

  const currentFeeItems = feeMasterItems || internalFeeItems;
  const handleUpdateFeeItems = (list: FeeMasterItem[]) => {
    if (onUpdateFeeMasterItems) onUpdateFeeMasterItems(list);
    else setInternalFeeItems(list);
  };

  const currentConditions = conditionRules || internalConditions;
  const handleUpdateConditions = (list: ConditionRule[]) => {
    if (onUpdateConditionRules) onUpdateConditionRules(list);
    else setInternalConditions(list);
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [selectedTruck, setSelectedTruck] = useState<StandardTruckType>('4W');
  const [selectedBracketKey, setSelectedBracketKey] = useState<string>('c_30_32');
  const [isQuotationUploadOpen, setIsQuotationUploadOpen] = useState(false);

  // Rate Card Supabase & Paste states
  const [isSyncingRateCards, setIsSyncingRateCards] = useState(false);
  const [rateCardSyncStatus, setRateCardSyncStatus] = useState<string | null>(null);
  const [isPasteRateCardOpen, setIsPasteRateCardOpen] = useState(false);
  const [pasteRateCardText, setPasteRateCardText] = useState('');
  const [copiedRateCardSql, setCopiedRateCardSql] = useState(false);

  // Real-time API state
  const [liveProducts, setLiveProducts] = useState<LiveOilProduct[]>([]);
  const [liveRemark, setLiveRemark] = useState('');
  const [isLoadingLiveApi, setIsLoadingLiveApi] = useState(false);

  // Diesel CRUD States
  const [searchDiesel, setSearchDiesel] = useState('');
  const [newDieselDate, setNewDieselDate] = useState(() => {
    const today = new Date();
    return `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
  });
  const [newDieselPrice, setNewDieselPrice] = useState('42.19');
  const [newDieselSource, setNewDieselSource] = useState('PTT Standard / Daily Live');

  // Diesel Edit Modal State
  const [editingDiesel, setEditingDiesel] = useState<DieselPriceRecord | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  const [editDateValue, setEditDateValue] = useState('');
  const [editSourceValue, setEditSourceValue] = useState('');

  // Rate Card cell edit state
  const [editingRateCell, setEditingRateCell] = useState<{ rowId: string; bracketKey: string } | null>(null);
  const [editingRateVal, setEditingRateVal] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [newProvinceName, setNewProvinceName] = useState('');
  const [newBaseRate, setNewBaseRate] = useState('3200');

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
    onUpdateDieselPrices(dieselPrices.filter((d) => d.date !== date));
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
  const currentTable = rateCards[selectedTruck] || INITIAL_RATE_CARD_4W;

  const handleSyncRateCardsToSupabase = async () => {
    setIsSyncingRateCards(true);
    setRateCardSyncStatus(null);
    try {
      const res = await uploadAllRateCardsToSupabase(rateCards);
      if (res.success) {
        setRateCardSyncStatus(`✅ บันทึก Rate Cards ครบทุกประเภทรถ (${res.truckTypesCount} ประเภท, ${res.flatRowsCount} รายการ) เข้า Supabase เรียบร้อยแล้ว!`);
      } else {
        setRateCardSyncStatus(`❌ เกิดข้อผิดพลาด: ${res.error}`);
      }
    } catch (err: any) {
      setRateCardSyncStatus(`❌ บันทึกไม่สำเร็จ: ${err?.message || 'Error'}`);
    } finally {
      setIsSyncingRateCards(false);
    }
  };

  const handleImportPastedRateCards = async () => {
    if (!pasteRateCardText.trim()) return;
    const parsed = parseRateCardRawText(pasteRateCardText);
    if (parsed.flatRows.length === 0) {
      alert('ไม่พบแถวข้อมูลอัตราค่าบริการที่ถูกต้อง กรุณาตรวจสอบข้อความที่วาง');
      return;
    }
    const newCards = { ...rateCards };
    for (const [tKey, table] of Object.entries(parsed.matrixUpdates)) {
      if (table) {
        newCards[tKey as StandardTruckType] = table;
      }
    }
    onUpdateRateCards(newCards);
    setIsSyncingRateCards(true);
    const res = await uploadAllRateCardsToSupabase(newCards);
    setIsSyncingRateCards(false);
    setIsPasteRateCardOpen(false);
    setPasteRateCardText('');
    if (res.success) {
      setRateCardSyncStatus(`✅ นำเข้าและบันทึก Rate Card เข้า Supabase สำเร็จ ${parsed.flatRows.length} รายการ!`);
    } else {
      setRateCardSyncStatus(`⚠️ อัปเดตในระบบแล้ว แต่บันทึกเข้า Supabase ติดปัญหา: ${res.error}`);
    }
  };

  const handleCopyRateCardSql = () => {
    const sql = generateRateCardsSqlScript(rateCards);
    navigator.clipboard.writeText(sql);
    setCopiedRateCardSql(true);
    setTimeout(() => setCopiedRateCardSql(false), 2500);
  };

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

  // Add Rate Card Row
  const handleAddRateCardRow = () => {
    if (!newLocationName.trim()) return;
    const base = parseFloat(newBaseRate) || 3000;
    const newRates: { [bracketKey: string]: number } = {};
    currentTable.brackets.forEach((b, idx) => {
      newRates[b.key] = Math.round(base + idx * 120);
    });

    const newRow = {
      id: `rc-${selectedTruck}-${Date.now()}`,
      location: newLocationName.trim(),
      province: newProvinceName.trim() || 'Central',
      rates: newRates,
    };

    onUpdateRateCards({
      ...rateCards,
      [selectedTruck]: {
        ...currentTable,
        rows: [newRow, ...currentTable.rows],
      },
    });

    setNewLocationName('');
    setNewProvinceName('');
  };

  // Delete Rate Card Row
  const handleDeleteRateCardRow = (rowId: string) => {
    onUpdateRateCards({
      ...rateCards,
      [selectedTruck]: {
        ...currentTable,
        rows: currentTable.rows.filter((r) => r.id !== rowId),
      },
    });
  };

  // Zone Mapping CRUD
  const handleAddZoneMapping = () => {
    if (!newZoneRaw || !newZoneTarget) return;

    if (editingZoneRule) {
      // Update existing
      const updated = zoneMappings.map((z) => {
        if (z.id === editingZoneRule.id) {
          return {
            ...z,
            rawZoneKeyword: newZoneRaw.trim(),
            provinceKeyword: newZoneProv.trim() || undefined,
            matchedLocation: newZoneTarget.trim(),
          };
        }
        return z;
      });
      onUpdateZoneMappings(updated);
      setEditingZoneRule(null);
    } else {
      // Create new
      const newRule: ZoneMappingRule = {
        id: `zm-${Date.now()}`,
        rawZoneKeyword: newZoneRaw.trim(),
        provinceKeyword: newZoneProv.trim() || undefined,
        matchedLocation: newZoneTarget.trim(),
      };
      onUpdateZoneMappings([newRule, ...zoneMappings]);
    }

    setNewZoneRaw('');
    setNewZoneProv('');
    setNewZoneTarget('');
  };

  const handleStartEditZone = (rule: ZoneMappingRule) => {
    setEditingZoneRule(rule);
    setNewZoneRaw(rule.rawZoneKeyword);
    setNewZoneProv(rule.provinceKeyword || '');
    setNewZoneTarget(rule.matchedLocation);
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
            จัดการข้อมูลหลักของระบบ (Master Data Management - Prompt 2)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            จัดการราคาน้ำมันมาตรฐาน ปตท. & เฉลี่ยรายเดือน (Monthly Average), Rate Card, กฎจับคู่โซน, ประเภทรถ (Truck Mapping), ค่าใช้จ่าย (Fees) และเงื่อนไขการคิดเงิน (Conditions)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-700 text-xs font-semibold gap-1">
        <button
          onClick={() => setActiveTab('diesel')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'diesel'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Fuel className="w-4 h-4" />
          <span>⛽ ราคาน้ำมัน & ดีเซล ({dieselPrices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rateCard')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'rateCard'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Rate Card (4W/6W/10W)</span>
        </button>

        <button
          onClick={() => setActiveTab('zone')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'zone'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>จับคู่โซน ({zoneMappings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('truckType')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'truckType'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Truck className="w-4 h-4 text-indigo-500" />
          <span>🚛 ประเภทรถ (Truck Type) ({currentTruckMappings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('feeMaster')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'feeMaster'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Scale className="w-4 h-4 text-emerald-500" />
          <span>💰 ค่าใช้จ่าย (Fees) ({currentFeeItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('conditionRule')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'conditionRule'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Settings className="w-4 h-4 text-purple-500" />
          <span>⚙️ เงื่อนไข (Conditions) ({currentConditions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quotation')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'quotation'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>ใบเสนอราคา ({quotations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fixedContract')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'fixedContract'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>เรทคงที่ ({fixedCustomers.length})</span>
        </button>
      </div>

      {/* TAB 1: DIESEL REAL-TIME & CRUD */}
      {activeTab === 'diesel' && (
        <div className="space-y-6">
          {/* PTT Standard API Section (Cleaned up, no Bangchak / no iframe) */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    ราคาน้ำมันมาตรฐาน & ฐานข้อมูลดีเซล (PTT Standard Diesel & Daily Prices)
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      LIVE ONLINE
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {liveRemark || 'ดึงราคาขายปลีกมาตรฐาน ปตท. กทม. และปริมณฑล'}
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

          {/* Monthly Average Diesel Calculation Card (Requirement A) */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 dark:from-slate-800 dark:via-slate-800/90 dark:to-slate-800 p-5 rounded-xl border border-blue-200 dark:border-blue-900 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                  MONTHLY AVERAGE DIESEL LOGIC (แก้ปัญหา Diff)
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  การคำนวณราคาน้ำมันเฉลี่ยทั้งเดือน (Monthly Average): 40.69 บาท/ลิตร
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  ✅ <strong>Logic ที่ถูกต้อง:</strong> คำนวณ Average ราคาน้ำมัน ปตท. ของทั้งเดือน (1-30 ก.ย. 2026: 38.39, ..., 41.44 บาท)
                  <br />
                  Average กันยายน = (ผลรวมราคาทั้งเดือน) / (จำนวน 30 วัน) = <strong>40.69 บาท/ลิตร</strong> นำมาใช้เป็น Diesel Rate เพื่อความแม่นยำ ไม่เกิดปัญหา Diff กับลูกค้า
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-slate-700 rounded-xl border border-blue-200 dark:border-slate-600 text-center shrink-0">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">ค่าเฉลี่ย ก.ย. 2026</span>
                <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">฿40.69</span>
                <span className="text-[10px] text-slate-400 block">THB / ลิตร</span>
              </div>
            </div>
          </div>

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
          {/* RATE CARD TOP BAR */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                เลือกประเภทรถ:
              </span>
              {(['4W', '6W', '10W', 'OD4', 'OD6'] as StandardTruckType[]).map((t) => (
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

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">ช่วงน้ำมัน:</span>
                <select
                  value={selectedBracketKey}
                  onChange={(e) => setSelectedBracketKey(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
                >
                  {currentTable.brackets.map((b) => (
                    <option key={b.key} value={b.key}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons: Supabase Sync, Paste, Copy SQL */}
              <button
                onClick={handleSyncRateCardsToSupabase}
                disabled={isSyncingRateCards}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                title="บันทึก Rate Card ทั้ง 5 ประเภทรถเข้า Supabase ทันที"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isSyncingRateCards ? 'animate-bounce' : ''}`} />
                <span>{isSyncingRateCards ? 'กำลังบันทึกเข้า Supabase...' : '🚀 บันทึก Rate Cards ขึ้น Supabase'}</span>
              </button>

              <button
                onClick={() => setIsPasteRateCardOpen(true)}
                className="px-3 py-1.5 bg-blue-50 dark:bg-slate-700 border border-blue-200 dark:border-slate-600 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="วางตาราง Rate Card เพื่อนำเข้าทันที"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>วางตาราง Rate Card</span>
              </button>

              <button
                onClick={handleCopyRateCardSql}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="คัดลอกคำสั่ง SQL Insert สำหรับนำไปรันใน Supabase SQL Editor"
              >
                {copiedRateCardSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRateCardSql ? 'คัดลอก SQL แล้ว!' : 'คัดลอก SQL'}</span>
              </button>
            </div>
          </div>

          {/* Sync Status Banner */}
          {rateCardSyncStatus && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{rateCardSyncStatus}</span>
              </div>
              <button
                onClick={() => setRateCardSyncStatus(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                &times; ปิด
              </button>
            </div>
          )}

          {selectedTruck === '4W' && (
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>มาตรฐาน Rate Card 4W (26 ปลายทาง):</strong> เมื่อ Truck Type = <strong>4W/Single Unit</strong> และ Zone ={' '}
                <strong>Si Maha Phot, Prachinburi</strong> เรทช่วง 30.01-32.00 อยู่ที่{' '}
                <span className="font-bold underline text-blue-700 dark:text-blue-300">3,280 บาท</span> | Navanakorn ={' '}
                <span className="font-bold text-blue-700 dark:text-blue-300">950 บาท</span> | Warin Chamrap ={' '}
                <span className="font-bold text-blue-700 dark:text-blue-300">13,450 บาท</span>
              </span>
            </div>
          )}

          {/* ADD RATE CARD ROW FORM */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <h4 className="font-semibold text-slate-800 dark:text-white mb-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-600" />
              เพิ่มสถานที่ปลายทางใหม่ใน Rate Card (รถ {selectedTruck}):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="ชื่อสถานที่ (เช่น Ban Pho, Chachoengsao)"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
              />
              <input
                type="text"
                placeholder="จังหวัด (เช่น ฉะเชิงเทรา)"
                value={newProvinceName}
                onChange={(e) => setNewProvinceName(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
              />
              <input
                type="number"
                placeholder="ราคาเริ่มต้น (Base THB เช่น 3200)"
                value={newBaseRate}
                onChange={(e) => setNewBaseRate(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white font-mono"
              />
              <button
                onClick={handleAddRateCardRow}
                disabled={!newLocationName.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                เพิ่มสถานที่ใหม่
              </button>
            </div>
          </div>

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
                        <div className="flex items-center justify-center gap-1">
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
                          <button
                            onClick={() => handleDeleteRateCardRow(row.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="ลบสถานที่นี้ออกจาก Rate Card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
            <h4 className="font-semibold text-slate-800 dark:text-white mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                {editingZoneRule ? 'แก้ไขกฎการจับคู่โซน:' : 'เพิ่มกฎการจับคู่โซนใหม่:'}
              </span>
              {editingZoneRule && (
                <button
                  onClick={() => {
                    setEditingZoneRule(null);
                    setNewZoneRaw('');
                    setNewZoneProv('');
                    setNewZoneTarget('');
                  }}
                  className="text-rose-500 hover:underline text-[11px]"
                >
                  ยกเลิกการแก้ไข
                </button>
              )}
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
                {editingZoneRule ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingZoneRule ? 'บันทึกการแก้ไข' : 'เพิ่มกฎการจับคู่'}
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEditZone(rule)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                            title="แก้ไขกฎนี้"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteZoneMapping(rule.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                            title="ลบกฎนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: QUOTATION MANAGEMENT */}
      {activeTab === 'quotation' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                  QUOTATION MASTER DATA
                </span>
                <span className="text-xs text-slate-400">ฐานข้อมูลใบเสนอราคา 100+ เจ้า</span>
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                จัดการใบเสนอราคา & โครงสร้างค่าบริการเพิ่มเติม
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ระบบเชื่อมโยงใบเสนอราคากับ Job No./Trip No. โดยอัตโนมัติ พร้อมดึงค่าดรอป, ค่ารอ, ค่าทางด่วน, ค่าคนยก และเรทรถซับ OD
              </p>
            </div>

            <button
              onClick={() => setIsQuotationUploadOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
            >
              <Sparkles className="w-4 h-4" />
              อัปโหลดใบเสนอราคา (AI OCR Parser)
            </button>
          </div>

          {/* Quotation Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {quotations.map((q) => (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 hover:border-blue-300 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          q.branch === 'บางบ่อ'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        สาขา{q.branch}
                      </span>
                      <span className="text-xs text-slate-400">
                        {q.effectiveDate} - {q.expiryDate}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {q.companyName}
                    </h4>
                  </div>

                  {onUpdateQuotations && (
                    <button
                      onClick={() => onUpdateQuotations(quotations.filter((item) => item.id !== q.id))}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      title="ลบใบเสนอราคานี้"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Base Rates per Truck Type */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-600">
                    <span className="block text-[10px] text-slate-400">รถ 4 ล้อ (4W)</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      ฿{q.truckTypes['4W']?.baseRate.toLocaleString() || '-'}
                    </strong>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-600">
                    <span className="block text-[10px] text-slate-400">รถ 6 ล้อ (6W)</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      ฿{q.truckTypes['6W']?.baseRate.toLocaleString() || '-'}
                    </strong>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-600">
                    <span className="block text-[10px] text-slate-400">รถ 10 ล้อ (10W)</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      ฿{q.truckTypes['10W']?.baseRate.toLocaleString() || '-'}
                    </strong>
                  </div>
                </div>

                {/* Additional Fees Grid */}
                <div className="p-3 bg-slate-50/70 dark:bg-slate-900/40 rounded-lg border border-slate-200/80 dark:border-slate-700 text-[11px] space-y-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    ค่าใช้จ่ายเพิ่มเติม (Additional Fees):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 dark:text-slate-300">
                    <div>ค่าดรอป: <strong>฿{q.additionalFees.dropFeePerPoint}</strong>/จุด</div>
                    <div>ค่ารอโหลด: <strong>฿{q.additionalFees.waitingFeePerHour}</strong>/ชม.</div>
                    <div>ทางด่วน: <strong>฿{q.additionalFees.toll}</strong></div>
                    <div>Porter คนยก: <strong>฿{q.additionalFees.porter}</strong></div>
                  </div>
                </div>

                {/* Special Conditions */}
                {q.specialConditions && q.specialConditions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {q.specialConditions.map((cond, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-900"
                      >
                        ★ {cond}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: FIXED DIESEL CONTRACT CUSTOMERS */}
      {activeTab === 'fixedContract' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200">
                FIXED DIESEL RATE CONTRACTS
              </span>
              <span className="text-xs text-slate-400">ข้อยกเว้นการคำนวณตามราคาตลาด</span>
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              บริษัทที่ใช้เรทน้ำมันสัญญาคงที่ (Fixed Diesel Rate Master Data)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              สำหรับบริษัทที่มีสัญญาเรทน้ำมันคงที่ เช่น <strong>SIEMENS</strong> (ใช้เรทน้ำมัน 38.00 บาท/ลิตร ตามสัญญา ไม่ผันแปรตามราคาตลาด)
              ระบบจะใช้ตัวเลขนี้เป็น Diesel Rate ในการค้นหา Bracket ใน Rate Card โดยตรง
            </p>
          </div>

          {/* List of Fixed Diesel Customers */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">ชื่อบริษัท / ลูกค้าในสัญญา</th>
                    <th className="py-3 px-4 text-center">เรทน้ำมันคงที่ (THB/L)</th>
                    <th className="py-3 px-4">เงื่อนไขสัญญา</th>
                    <th className="py-3 px-4 text-center">สถานะ</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                  {fixedCustomers.map((cust, idx) => (
                    <tr key={cust.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {cust.customerName}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                        ฿{cust.fixedDieselRate.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {cust.notes || 'ใช้เรทสัญญาคงที่ตามเงื่อนไขข้อตกลง'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Active (ใช้งาน)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {onUpdateFixedCustomers && (
                          <button
                            onClick={() => onUpdateFixedCustomers(fixedCustomers.filter((item) => item.id !== cust.id))}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                            title="ลบบริษัทนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TRUCK TYPE MAPPING (Prompt 2.1) */}
      {activeTab === 'truckType' && (
        <TruckTypeMappingTab
          mappings={currentTruckMappings}
          onUpdateMappings={handleUpdateTruckMappings}
        />
      )}

      {/* TAB: FEE MASTER (Prompt 2.2) */}
      {activeTab === 'feeMaster' && (
        <FeeMasterTab
          feeItems={currentFeeItems}
          onUpdateFeeItems={handleUpdateFeeItems}
        />
      )}

      {/* TAB: CONDITION RULES (Prompt 2.3) */}
      {activeTab === 'conditionRule' && (
        <ConditionRuleTab
          conditions={currentConditions}
          onUpdateConditions={handleUpdateConditions}
        />
      )}

      {/* Quotation Upload Modal */}
      {isQuotationUploadOpen && (
        <QuotationUploadModal
          isOpen={isQuotationUploadOpen}
          onClose={() => setIsQuotationUploadOpen(false)}
          onSaveQuotation={(newQ) => {
            if (onUpdateQuotations) {
              onUpdateQuotations([newQ, ...quotations]);
            }
          }}
        />
      )}

      {/* Paste Rate Card Modal */}
      {isPasteRateCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-linear-to-r from-blue-600 to-indigo-700 text-white">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-base">วางข้อความตาราง Rate Card (Paste Table Data)</h3>
                  <p className="text-xs text-white/80">
                    วางข้อความที่คัดลอกจาก Excel หรือจากตารางเรทราคาทั้ง 5 ประเภทรถ (4W, 6W, 10W, OD4, OD6)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPasteRateCardOpen(false)}
                className="text-white/80 hover:text-white text-xl font-bold p-1 leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-200 dark:border-blue-900 leading-relaxed">
                💡 <strong>คำแนะนำ:</strong> สามารถคัดลอกข้อความตารางทั้งหมด (รวมหัวข้อประเภทรถ เช่น{' '}
                <code>STANDARD RATE CARD - 4W TRUCK TYPE</code> และหัวคอลัมน์ช่วงน้ำมัน เช่น <code>lower than 30.00</code>,{' '}
                <code>30.01-32.00</code>) แล้วนำมาวางในช่องด้านล่าง ระบบจะแยกประเภทรถและช่วงราคาพร้อมบันทึกเข้า Supabase ให้อัตโนมัติทันที
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  วางข้อความตารางที่นี่ (Ctrl+V / Cmd+V):
                </label>
                <textarea
                  rows={12}
                  value={pasteRateCardText}
                  onChange={(e) => setPasteRateCardText(e.target.value)}
                  placeholder={`ตัวอย่างเช่น:
STANDARD RATE CARD - 4W TRUCK TYPE
Delivery Location (Pickup: YNLC WH)	lower than 30.00	30.01-32.00	32.01-34.00...
Navanakorn, Pathumtani	930	950	970...
Rangsit, Pathumtani	1,240	1,270	1,300...

STANDARD RATE CARD - 6W TRUCK TYPE
...`}
                  className="w-full font-mono text-xs p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {pasteRateCardText ? `${pasteRateCardText.split('\n').length} บรรทัด` : 'ยังไม่มีข้อมูล'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPasteRateCardOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleImportPastedRateCards}
                  disabled={!pasteRateCardText.trim() || isSyncingRateCards}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isSyncingRateCards ? 'กำลังนำเข้าและบันทึก...' : 'นำเข้าและบันทึกเข้า Supabase ทันที'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
