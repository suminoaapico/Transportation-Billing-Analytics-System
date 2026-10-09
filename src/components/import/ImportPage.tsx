import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Eye,
  Trash2,
  Download,
  Database,
  Cloud,
  Layers,
  Fuel,
  Truck,
  Check,
  Scale,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { parseUploadedRawData, downloadRawData69TemplateExcel } from '../../services/excelService';
import {
  parseUploadedRateCardFile,
  parseUploadedFuelPricesFile,
  ParsedRateCardEntry,
  ParsedFuelEntry,
} from '../../services/masterImportParser';
import {
  saveTripsToSupabase,
  saveFlatRateCardsToSupabase,
  saveRateCardsToSupabase,
  uploadAllRateCardsToSupabase,
  saveFuelPricesToSupabase,
  saveRawDataRecordsToSupabase,
  saveDieselPricesToSupabase,
} from '../../services/supabaseService';
import {
  downloadRateCardMasterExcel,
  downloadDieselDatabaseExcel,
} from '../../services/sampleFilesService';
import {
  INITIAL_RATE_CARD_4W,
  INITIAL_RATE_CARD_6W,
  INITIAL_RATE_CARD_10W,
  INITIAL_RATE_CARD_OD4,
  INITIAL_RATE_CARD_OD6,
} from '../../data/seedData';
import {
  RawTripData,
  StandardTruckType,
  DieselPriceRecord,
  RateCardTable,
} from '../../types';
import { normalizeTruckType } from '../../services/billingCalculator';

interface ImportPageProps {
  onImportRawData: (trips: RawTripData[]) => void;
  onResetSeedData: () => void;
  onClearTrips?: () => void;
  currentTripsCount: number;
  onNavigateToReconciliation?: () => void;
  onOpenSupabaseModal?: () => void;
  // Optional master state updaters
  dieselPrices?: DieselPriceRecord[];
  onUpdateDieselPrices?: (prices: DieselPriceRecord[]) => void;
  rateCards?: { [key in StandardTruckType]: RateCardTable };
  onUpdateRateCards?: (cards: { [key in StandardTruckType]: RateCardTable }) => void;
  addToast?: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const ImportPage: React.FC<ImportPageProps> = ({
  onImportRawData,
  onResetSeedData,
  onClearTrips,
  currentTripsCount,
  onNavigateToReconciliation,
  onOpenSupabaseModal,
  dieselPrices = [],
  onUpdateDieselPrices,
  rateCards,
  onUpdateRateCards,
  addToast,
}) => {
  // Navigation tabs in import center
  const [activeTab, setActiveTab] = useState<'cards' | 'raw' | 'rateCard' | 'diesel'>('cards');

  // Common UI State
  const [dragCard, setDragCard] = useState<'card1' | 'card2' | 'card3' | null>(null);

  // Card 1: Rate Card State
  const [card1File, setCard1File] = useState<File | null>(null);
  const [card1Branch, setCard1Branch] = useState<'NLC' | 'BLC'>('NLC');
  const [card1TruckType, setCard1TruckType] = useState<StandardTruckType | 'ALL'>('ALL');
  const [card1Parsed, setCard1Parsed] = useState<ParsedRateCardEntry[]>([]);
  const [card1Status, setCard1Status] = useState<{ loading: boolean; success?: string; error?: string }>({ loading: false });

  // Card 2: Fuel Prices State
  const [card2File, setCard2File] = useState<File | null>(null);
  const [card2Company, setCard2Company] = useState<string>('');
  const [card2Parsed, setCard2Parsed] = useState<ParsedFuelEntry[]>([]);
  const [card2Status, setCard2Status] = useState<{ loading: boolean; success?: string; error?: string }>({ loading: false });

  // Card 3: Raw Data State
  const [card3File, setCard3File] = useState<File | null>(null);
  const [card3Branch, setCard3Branch] = useState<'NLC' | 'BLC'>('NLC');
  const [card3Month, setCard3Month] = useState<string>('Sep-26');
  const [card3Parsed, setCard3Parsed] = useState<RawTripData[]>([]);
  const [card3Status, setCard3Status] = useState<{ loading: boolean; success?: string; error?: string }>({ loading: false });

  // -------------------------------------------------------------
  // Card 1 Handlers: Rate Card Upload
  // -------------------------------------------------------------
  const handleCard1FileSelect = async (file: File) => {
    setCard1File(file);
    setCard1Status({ loading: true });
    try {
      const buffer = await file.arrayBuffer();
      const res = parseUploadedRateCardFile(buffer, card1Branch, card1TruckType);
      if (res.flatRows.length === 0) {
        throw new Error('ไม่พบแถวข้อมูลอัตราค่าบริการในไฟล์ หรือโครงสร้างคอลัมน์ไม่ตรง');
      }
      setCard1Parsed(res.flatRows);
      setCard1Status({
        loading: false,
        success: `อ่านไฟล์สำเร็จพบ ${res.flatRows.length} รายการ (พร้อมบันทึกเข้า Supabase)`,
      });
    } catch (err: any) {
      setCard1Parsed([]);
      setCard1Status({ loading: false, error: err.message || 'อ่านไฟล์ไม่สำเร็จ' });
    }
  };

  const handleCard1UploadAndSave = async () => {
    if (card1Parsed.length === 0) {
      if (card1File) await handleCard1FileSelect(card1File);
      else return;
    }

    setCard1Status({ loading: true });
    try {
      // 1. Direct save into `rate_cards` table in Supabase
      const res = await saveFlatRateCardsToSupabase(
        card1Parsed.map((r) => ({
          branch: r.branch || card1Branch,
          zone: r.zone,
          truckType: r.truckType,
          weightMin: r.weightMin,
          weightMax: r.weightMax,
          price: r.price,
          effectiveDate: r.effectiveDate,
          expiryDate: r.expiryDate,
          rawJson: r.rawJson,
        }))
      );

      // 2. Also update local state if rateCards updater is provided
      if (onUpdateRateCards && rateCards) {
        const updated = { ...rateCards };
        for (const row of card1Parsed) {
          const tType = (row.truckType === 'OD6' ? 'OD6' : row.truckType === 'OD4' ? 'OD4' : row.truckType === '6W' ? '6W' : row.truckType === '10W' ? '10W' : '4W') as StandardTruckType;
          const card = updated[tType];
          if (card) {
            const existingRow = card.rows.find((r) => r.location.toLowerCase() === row.zone.toLowerCase());
            if (existingRow) {
              existingRow.rates['c_30_32'] = row.price;
            }
          }
        }
        onUpdateRateCards(updated);
        // Also sync matrix to transport_rate_cards
        await saveRateCardsToSupabase(updated);
      }

      setCard1Status({
        loading: false,
        success: `✅ บันทึก Rate Cards จำนวน ${card1Parsed.length} รายการ เข้าสู่ฐานข้อมูล Supabase (ตาราง rate_cards & transport_rate_cards) อัตโนมัติเรียบร้อย!`,
      });

      if (addToast) {
        addToast(
          'success',
          'อัปโหลด Rate Card สำเร็จ',
          `บันทึกข้อมูล ${card1Parsed.length} รายการ เข้าตาราง rate_cards ใน Supabase อัตโนมัติแล้ว`
        );
      }
    } catch (err: any) {
      setCard1Status({ loading: false, error: err.message || 'บันทึกเข้า Supabase ล้มเหลว' });
    }
  };

  const handleSyncStandardRateCards = async () => {
    setCard1Status({ loading: true });
    try {
      const standardCards = rateCards || {
        '4W': INITIAL_RATE_CARD_4W,
        '6W': INITIAL_RATE_CARD_6W,
        '10W': INITIAL_RATE_CARD_10W,
        'OD4': INITIAL_RATE_CARD_OD4,
        'OD6': INITIAL_RATE_CARD_OD6,
      };

      const res = await uploadAllRateCardsToSupabase(standardCards, card1Branch);
      if (res.success) {
        setCard1Status({
          loading: false,
          success: `✅ บันทึก Master Rate Card 26 ปลายทาง (${res.truckTypesCount} ประเภทรถ, ${res.flatRowsCount} รายการ) เข้า Supabase สำเร็จแล้ว!`,
        });
        if (addToast) {
          addToast(
            'success',
            'ซิงค์ Master Rate Card สำเร็จ',
            `บันทึกข้อมูล ${res.flatRowsCount} รายการ (4W, 6W, 10W, OD4, OD6) เข้าตาราง rate_cards & transport_rate_cards ใน Supabase อัตโนมัติแล้ว`
          );
        }
      } else {
        setCard1Status({ loading: false, error: res.error || 'บันทึกเข้า Supabase ไม่สำเร็จ' });
      }
    } catch (err: any) {
      setCard1Status({ loading: false, error: err?.message || 'เกิดข้อผิดพลาดในการซิงค์' });
    }
  };

  // -------------------------------------------------------------
  // Card 2 Handlers: Fuel Price Upload
  // -------------------------------------------------------------
  const handleCard2FileSelect = async (file: File) => {
    setCard2File(file);
    setCard2Status({ loading: true });
    try {
      const buffer = await file.arrayBuffer();
      const rows = parseUploadedFuelPricesFile(buffer, card2Company || undefined);
      if (rows.length === 0) {
        throw new Error('ไม่พบรายการราคาน้ำมันในไฟล์');
      }
      setCard2Parsed(rows);
      setCard2Status({
        loading: false,
        success: `อ่านไฟล์ราคาน้ำมันสำเร็จพบ ${rows.length} วัน (พร้อมบันทึกเข้า Supabase)`,
      });
    } catch (err: any) {
      setCard2Parsed([]);
      setCard2Status({ loading: false, error: err.message || 'อ่านไฟล์ไม่สำเร็จ' });
    }
  };

  const handleCard2UploadAndSave = async () => {
    if (card2Parsed.length === 0) {
      if (card2File) await handleCard2FileSelect(card2File);
      else return;
    }

    setCard2Status({ loading: true });
    try {
      // 1. Direct save to `fuel_prices` table in Supabase
      const res = await saveFuelPricesToSupabase(card2Parsed);

      // 2. Also save to `transport_diesel_prices` table in Supabase
      const dieselRecords: DieselPriceRecord[] = card2Parsed.map((p) => ({
        date: p.date,
        price: p.price,
        source: p.source || (p.company ? `Fixed Rate (${p.company})` : 'PTT Station'),
        updatedAt: new Date().toISOString(),
      }));
      await saveDieselPricesToSupabase(dieselRecords);

      // 3. Update local state
      if (onUpdateDieselPrices) {
        onUpdateDieselPrices(dieselRecords);
      }

      setCard2Status({
        loading: false,
        success: `✅ บันทึกราคาน้ำมัน ${card2Parsed.length} รายการ เข้าสู่ฐานข้อมูล Supabase อัตโนมัติเรียบร้อย!`,
      });

      if (addToast) {
        addToast(
          'success',
          'อัปโหลดค่าน้ำมันสำเร็จ',
          `บันทึกข้อมูลราคาน้ำมัน ${card2Parsed.length} วัน เข้าตาราง fuel_prices ใน Supabase เรียบร้อย`
        );
      }
    } catch (err: any) {
      setCard2Status({ loading: false, error: err.message || 'บันทึกเข้า Supabase ล้มเหลว' });
    }
  };

  // -------------------------------------------------------------
  // Card 3 Handlers: Raw Data Upload
  // -------------------------------------------------------------
  const handleCard3FileSelect = async (file: File) => {
    setCard3File(file);
    setCard3Status({ loading: true });
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseUploadedRawData(buffer);
      if (parsed.length === 0) {
        throw new Error('ไม่พบเที่ยวขนส่งในไฟล์ หรือโครงสร้าง 69 คอลัมน์ไม่ตรง');
      }

      // Override branch if user selected BLC/NLC explicitly
      const branchName = card3Branch === 'BLC' ? 'บางบ่อ' : 'นวนคร';
      const adjusted = parsed.map((t) => ({
        ...t,
        branch: branchName as 'บางบ่อ' | 'นวนคร',
      }));

      setCard3Parsed(adjusted);
      setCard3Status({
        loading: false,
        success: `อ่านข้อมูลสำเร็จพบ ${adjusted.length} เที่ยว (สาขา ${card3Branch}, ประจำงวด ${card3Month}) พร้อมบันทึกเข้า Supabase`,
      });
    } catch (err: any) {
      setCard3Parsed([]);
      setCard3Status({ loading: false, error: err.message || 'อ่านไฟล์ Raw Data ล้มเหลว' });
    }
  };

  const handleCard3UploadAndSave = async () => {
    if (card3Parsed.length === 0) {
      if (card3File) await handleCard3FileSelect(card3File);
      else return;
    }

    setCard3Status({ loading: true });
    try {
      // 1. Save directly into `raw_data` table in Supabase
      const resRaw = await saveRawDataRecordsToSupabase(card3Parsed, card3Branch);

      // 2. Save directly into `transport_trips` table in Supabase
      const resTrips = await saveTripsToSupabase(card3Parsed);

      // 3. Put into application state
      onImportRawData(card3Parsed);

      setCard3Status({
        loading: false,
        success: `✅ นำเข้าและบันทึก Raw Data ${card3Parsed.length} เที่ยว เข้าสู่ฐานข้อมูล Supabase อัตโนมัติเรียบร้อย!`,
      });

      if (addToast) {
        addToast(
          'success',
          'บันทึก Raw Data เข้า Supabase สำเร็จ',
          `บันทึกข้อมูลเที่ยวขนส่ง ${card3Parsed.length} รายการ เข้าสู่ตาราง raw_data & transport_trips ใน Supabase เรียบร้อย`
        );
      }
    } catch (err: any) {
      setCard3Status({ loading: false, error: err.message || 'บันทึกเข้า Supabase ไม่สำเร็จ' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <Cloud className="w-3 h-3" />
              SUPABASE AUTO SYNC MODULE
            </span>
            <span className="text-xs text-slate-400">REST API: dwpremcqguvpeheynvsk</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            ระบบอัปโหลดข้อมูลและบันทึกเข้า Supabase อัตโนมัติ (Data Import & Supabase Sync)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            อัปโหลดไฟล์ Excel / CSV แล้วระบบบันทึกเข้าฐานข้อมูล Supabase ทันที พร้อมระบบ Auto Sync
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Supabase Cloud Connection & Status Modal */}
          {onOpenSupabaseModal && (
            <button
              onClick={onOpenSupabaseModal}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              title="เปิดหน้าต่างจัดการฐานข้อมูล Supabase และรันคำสั่ง SQL สร้างตาราง"
            >
              <Database className="w-4 h-4" />
              <span>จัดการฐานข้อมูล Supabase (SQL Editor)</span>
            </button>
          )}

          {/* Navigate to Diff Check */}
          {onNavigateToReconciliation && (
            <button
              onClick={onNavigateToReconciliation}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              title="ไปยังหน้าจอเปรียบเทียบส่วนต่างราคา (Diff Check)"
            >
              <Scale className="w-4 h-4 text-teal-200" />
              <span>Diff Check</span>
            </button>
          )}

          {/* Clear Raw Data only */}
          {onClearTrips && (
            <button
              onClick={onClearTrips}
              disabled={currentTripsCount === 0}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs ${
                currentTripsCount > 0
                  ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                  : 'border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-50'
              }`}
              title="ล้างข้อมูลดิบเฉพาะเที่ยวรถทั้งหมดให้เป็น 0"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>ล้างข้อมูลดิบ ({currentTripsCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Upload Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ========================================================= */}
        {/* CARD 1: อัปโหลด Rate Card */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Card 1: อัปโหลด Rate Card
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">ตาราง rate_cards (เรทราคา)</p>
                </div>
              </div>
              <button
                onClick={() => downloadRateCardMasterExcel()}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                title="ดาวน์โหลดไฟล์ตัวอย่าง Rate Card"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ตัวอย่าง</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragCard('card1');
                }}
                onDragLeave={() => setDragCard(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragCard(null);
                  if (e.dataTransfer.files?.[0]) handleCard1FileSelect(e.dataTransfer.files[0]);
                }}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                  dragCard === 'card1'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
                }`}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  📁 ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                </p>
                <p className="text-[10px] text-slate-400 mt-1">รองรับ: .xlsx, .xls, .csv</p>

                <label className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                  <span>เลือกไฟล์</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleCard1FileSelect(e.target.files[0]);
                    }}
                  />
                </label>

                {card1File && (
                  <p className="mt-2 text-[11px] font-medium text-blue-600 dark:text-blue-400 truncate">
                    📄 {card1File.name}
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    เลือกสาขา
                  </label>
                  <select
                    value={card1Branch}
                    onChange={(e) => setCard1Branch(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="NLC">นวนคร (NLC)</option>
                    <option value="BLC">บางบ่อ (BLC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    ประเภทรถ
                  </label>
                  <select
                    value={card1TruckType}
                    onChange={(e) => setCard1TruckType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="ALL">ทั้งหมด (All Types)</option>
                    <option value="4W">4W (4 ล้อ)</option>
                    <option value="6W">6W (6 ล้อ)</option>
                    <option value="10W">10W (10 ล้อ)</option>
                    <option value="OD4">OD4 (รถซับ 4 ล้อ)</option>
                    <option value="OD6">OD6 (รถซับ 6 ล้อ)</option>
                  </select>
                </div>
              </div>

              {/* Status / Feedback */}
              {card1Status.error && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{card1Status.error}</span>
                </div>
              )}
              {card1Status.success && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{card1Status.success}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 space-y-2">
            <button
              onClick={handleCard1UploadAndSave}
              disabled={!card1File || card1Status.loading}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors ${
                !card1File || card1Status.loading
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {card1Status.loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกเข้า Supabase...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>📤 อัปโหลดและบันทึก (Rate Card)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSyncStandardRateCards}
              disabled={card1Status.loading}
              className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              title="บันทึก Rate Card 26 ปลายทางทั้ง 5 ประเภทรถ (4W, 6W, 10W, OD4, OD6) เข้า Supabase ทันที"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>⚡ ซิงค์ Master Rate Card 26 ปลายทาง เข้า Supabase ทันที</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 2: อัปโหลดค่าน้ำมัน */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Fuel className="w-4 h-4 text-amber-600" />
                    Card 2: อัปโหลดค่าน้ำมัน
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">ตาราง fuel_prices (ค่าน้ำมัน)</p>
                </div>
              </div>
              <button
                onClick={() => downloadDieselDatabaseExcel()}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                title="ดาวน์โหลดไฟล์ตัวอย่างค่าน้ำมัน PTT"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ตัวอย่าง PTT</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragCard('card2');
                }}
                onDragLeave={() => setDragCard(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragCard(null);
                  if (e.dataTransfer.files?.[0]) handleCard2FileSelect(e.dataTransfer.files[0]);
                }}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                  dragCard === 'card2'
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-600 hover:border-amber-400'
                }`}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <Fuel className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  📁 ลากไฟล์มาวางที่นี่ (PTT Diesel Database)
                </p>
                <p className="text-[10px] text-slate-400 mt-1">รองรับ: .xlsx, .xls, .csv</p>

                <label className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                  <span>เลือกไฟล์</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleCard2FileSelect(e.target.files[0]);
                    }}
                  />
                </label>

                {card2File && (
                  <p className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-400 truncate">
                    📄 {card2File.name}
                  </p>
                )}
              </div>

              {/* Controls */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  เลือกบริษัท (สำหรับ Fixed Rate เช่น Siemens)
                </label>
                <input
                  type="text"
                  placeholder="ระบุชื่อบริษัท หรือเว้นว่างหากเป็นราคาผันแปรทั่วไป"
                  value={card2Company}
                  onChange={(e) => setCard2Company(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 ลูกค้าที่ล็อกราคาน้ำมัน (is_fixed = true) ระบบจะไม่ผันแปรตามราคาน้ำมันรายวัน
                </p>
              </div>

              {/* Status / Feedback */}
              {card2Status.error && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{card2Status.error}</span>
                </div>
              )}
              {card2Status.success && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{card2Status.success}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={handleCard2UploadAndSave}
              disabled={!card2File || card2Status.loading}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors ${
                !card2File || card2Status.loading
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {card2Status.loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกเข้า Supabase...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>📤 อัปโหลดและบันทึก (Fuel Prices)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CARD 3: อัปโหลด Raw Data */}
        {/* ========================================================= */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    Card 3: อัปโหลด Raw Data
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">ตาราง raw_data & transport_trips</p>
                </div>
              </div>
              <button
                onClick={() => downloadRawData69TemplateExcel()}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                title="ดาวน์โหลดแม่แบบ 69 คอลัมน์"
              >
                <Download className="w-3.5 h-3.5" />
                <span>แม่แบบ 69 คอลัมน์</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragCard('card3');
                }}
                onDragLeave={() => setDragCard(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragCard(null);
                  if (e.dataTransfer.files?.[0]) handleCard3FileSelect(e.dataTransfer.files[0]);
                }}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                  dragCard === 'card3'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400'
                }`}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  📁 ลากไฟล์ Daily Raw Data มาวางที่นี่
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  รองรับ 69 คอลัมน์มาตรฐาน (AW=Truck Type, AX=Charge)
                </p>

                <label className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                  <span>เลือกไฟล์</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleCard3FileSelect(e.target.files[0]);
                    }}
                  />
                </label>

                {card3File && (
                  <p className="mt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
                    📄 {card3File.name}
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    เลือกสาขา
                  </label>
                  <select
                    value={card3Branch}
                    onChange={(e) => setCard3Branch(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="NLC">นวนคร (NLC)</option>
                    <option value="BLC">บางบ่อ (BLC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    เลือกเดือน / งวด
                  </label>
                  <input
                    type="text"
                    value={card3Month}
                    onChange={(e) => setCard3Month(e.target.value)}
                    placeholder="เช่น Sep-26, Oct-26"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Status / Feedback */}
              {card3Status.error && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{card3Status.error}</span>
                </div>
              )}
              {card3Status.success && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{card3Status.success}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={handleCard3UploadAndSave}
              disabled={!card3File || card3Status.loading}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors ${
                !card3File || card3Status.loading
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {card3Status.loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกเข้า Supabase...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>📤 อัปโหลดและบันทึก (Raw Data)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Section if Card 3 has parsed records */}
      {card3Parsed.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                ตัวอย่างข้อมูลดิบ Card 3 ({card3Parsed.length} รายการ)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ระบบจำแนกประเภทรถจากคอลัมน์ AW และเตรียมบันทึกเข้า Supabase
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCard3Parsed([])}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                ยกเลิก
              </button>
              <button
                onClick={handleCard3UploadAndSave}
                disabled={card3Status.loading}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                ยืนยันบันทึกเข้า Supabase ({card3Parsed.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-72 border border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/80 sticky top-0 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Issue Date</th>
                  <th className="py-2 px-3">Job No.</th>
                  <th className="py-2 px-3">Trip No.</th>
                  <th className="py-2 px-3">Consignee/Shipper</th>
                  <th className="py-2 px-3">Pick Up</th>
                  <th className="py-2 px-3">Delivery Site</th>
                  <th className="py-2 px-3">Truck Type</th>
                  <th className="py-2 px-3">Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {card3Parsed.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{row.issueDate}</td>
                    <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">{row.jobNo}</td>
                    <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">{row.tripNo}</td>
                    <td className="py-2 px-3 max-w-[180px] truncate">{row.consigneeShipper}</td>
                    <td className="py-2 px-3 max-w-[150px] truncate">{row.pickUpName}</td>
                    <td className="py-2 px-3 max-w-[180px] truncate">{row.deliveryName}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {row.truckType}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">{row.branch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active dataset summary footer */}
      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              สถานะการเชื่อมต่อ Supabase Database
              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Connected
              </span>
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              มีข้อมูลในระบบปัจจุบัน {currentTripsCount} เที่ยวขนส่ง • อัปโหลดข้อมูลผ่านการ์ด 1, 2, 3 เพื่อบันทึกเข้า Supabase Cloud อัตโนมัติ
            </p>
          </div>
        </div>

        {onResetSeedData && (
          <button
            onClick={onResetSeedData}
            className="px-3.5 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="รีเซ็ตค่าเริ่มต้นระบบ"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>รีเซ็ตระบบเริ่มต้น</span>
          </button>
        )}
      </div>
    </div>
  );
};
