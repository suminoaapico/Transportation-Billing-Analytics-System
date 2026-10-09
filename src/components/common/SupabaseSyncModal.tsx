import React, { useState, useEffect } from 'react';
import {
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  ExternalLink,
  ShieldCheck,
  Server,
  Layers,
  FileCode,
  Zap,
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
} from '../../services/supabaseClient';
import { SUPABASE_DATABASE_SCHEMA_SQL } from '../../services/supabaseSchema';
import {
  fullSyncPushToSupabase,
  fullSyncPullFromSupabase,
  clearAllTripsInSupabase,
} from '../../services/supabaseService';
import {
  RawTripData,
  DieselPriceRecord,
  RateCardTable,
  StandardTruckType,
  ZoneMappingRule,
  QuotationSchema,
  FixedDieselCustomer,
} from '../../types';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: RawTripData[];
  setTrips: React.Dispatch<React.SetStateAction<RawTripData[]>>;
  dieselPrices: DieselPriceRecord[];
  setDieselPrices: React.Dispatch<React.SetStateAction<DieselPriceRecord[]>>;
  rateCards: { [key in StandardTruckType]: RateCardTable };
  setRateCards: React.Dispatch<React.SetStateAction<{ [key in StandardTruckType]: RateCardTable }>>;
  zoneMappings: ZoneMappingRule[];
  setZoneMappings: React.Dispatch<React.SetStateAction<ZoneMappingRule[]>>;
  quotations: QuotationSchema[];
  setQuotations: React.Dispatch<React.SetStateAction<QuotationSchema[]>>;
  fixedCustomers: FixedDieselCustomer[];
  setFixedCustomers: React.Dispatch<React.SetStateAction<FixedDieselCustomer[]>>;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  trips,
  setTrips,
  dieselPrices,
  setDieselPrices,
  rateCards,
  setRateCards,
  zoneMappings,
  setZoneMappings,
  quotations,
  setQuotations,
  fixedCustomers,
  setFixedCustomers,
  addToast,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'sql' | 'settings'>('status');

  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tablesFound?: string[];
    missingTables?: string[];
  } | null>(null);

  const [isSyncingPush, setIsSyncingPush] = useState(false);
  const [isSyncingPull, setIsSyncingPull] = useState(false);
  const [isClearingTrips, setIsClearingTrips] = useState(false);

  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const conf = getStoredSupabaseConfig();
      setUrl(conf.url);
      setAnonKey(conf.anonKey);
      setAutoSync(conf.autoSync);
      // Auto test connection on open
      runTestConnection();
    }
  }, [isOpen]);

  const runTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Connection check failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    saveSupabaseConfig(url, anonKey, autoSync);
    addToast('success', 'บันทึกการตั้งค่า Supabase เรียบร้อยแล้ว');
    runTestConnection();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_DATABASE_SCHEMA_SQL);
    setCopiedSql(true);
    addToast('success', 'คัดลอกคำสั่ง SQL Schema ครบทุกตารางลงคลิปบอร์ดแล้ว');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Push local data to Supabase
  const handlePushData = async () => {
    setIsSyncingPush(true);
    try {
      const res = await fullSyncPushToSupabase({
        trips,
        dieselPrices,
        rateCards,
        zoneMappings,
        quotations,
        fixedCustomers,
      });

      if (res.success) {
        addToast('success', `อัปโหลดข้อมูลไปยัง Supabase สำเร็จทั้งหมด (เที่ยวรถ ${trips.length} รายการ, Master Data ครบ)`);
        runTestConnection();
      } else {
        addToast('error', `อัปโหลดเสร็จสิ้นแต่พบบางรายการผิดพลาด: ${res.errors.join(', ')}`);
      }
    } catch (err: any) {
      addToast('error', `อัปโหลดข้อมูลไม่สำเร็จ: ${err?.message || 'Error'}`);
    } finally {
      setIsSyncingPush(false);
    }
  };

  // Pull data from Supabase into local app
  const handlePullData = async () => {
    setIsSyncingPull(true);
    try {
      const res = await fullSyncPullFromSupabase();
      let importedCount = 0;

      if (res.trips && Array.isArray(res.trips)) {
        setTrips(res.trips);
        importedCount += res.trips.length;
      }
      if (res.dieselPrices && Array.isArray(res.dieselPrices)) {
        setDieselPrices(res.dieselPrices);
      }
      if (res.rateCards) {
        setRateCards(res.rateCards);
      }
      if (res.zoneMappings && Array.isArray(res.zoneMappings)) {
        setZoneMappings(res.zoneMappings);
      }
      if (res.quotations && Array.isArray(res.quotations)) {
        setQuotations(res.quotations);
      }
      if (res.fixedCustomers && Array.isArray(res.fixedCustomers)) {
        setFixedCustomers(res.fixedCustomers);
      }

      addToast('success', `ดึงข้อมูลจาก Supabase Cloud สำเร็จ (ได้รับเที่ยวรถ ${importedCount} รายการ และ Master Data อัปเดตครบ)`);
      runTestConnection();
    } catch (err: any) {
      addToast('error', `ดึงข้อมูลไม่สำเร็จ: ${err?.message || 'Error'}`);
    } finally {
      setIsSyncingPull(false);
    }
  };

  // Clear cloud trips
  const handleClearCloudTrips = async () => {
    if (!window.confirm('คุณต้องการลบข้อมูลเที่ยวรถใน Supabase Cloud ทั้งหมดใช่หรือไม่?')) return;
    setIsClearingTrips(true);
    try {
      const res = await clearAllTripsInSupabase();
      if (res.success) {
        addToast('info', 'ลบข้อมูลเที่ยวรถใน Supabase Cloud ทั้งหมดเรียบร้อยแล้ว');
      } else {
        addToast('error', `ลบข้อมูลไม่สำเร็จ: ${res.error}`);
      }
    } catch (err: any) {
      addToast('error', `ลบข้อมูลไม่สำเร็จ: ${err?.message}`);
    } finally {
      setIsClearingTrips(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">เชื่อมต่อและจัดการ Supabase Cloud Database</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-white/20 rounded-full border border-white/30 text-white">
                  PostgreSQL Cloud
                </span>
              </div>
              <p className="text-xs text-white/80">
                Project: <code className="font-mono bg-black/20 px-1.5 py-0.5 rounded">dwpremcqguvpeheynvsk</code> (รองรับข้อมูลไม่จำกัด ปลอดภัย 100%)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xl font-bold leading-none"
          >
            &times;
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-6">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'status'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>สถานะและการซิงค์ (Sync Center)</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'sql'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>SQL Script สร้างตาราง (Database Schema)</span>
            <span className="px-1.5 py-0.2 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded font-bold">
              พร้อมรัน
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'settings'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>ตั้งค่า API Key & URL</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: STATUS & SYNC */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Connection Status Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  testResult?.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {testResult?.success ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">
                      {testResult ? (testResult.success ? 'เชื่อมต่อ Supabase สำเร็จแล้ว' : 'แจ้งเตือนสถานะ Supabase') : 'กำลังตรวจสอบการเชื่อมต่อ...'}
                    </h4>
                    <p className="text-xs mt-0.5 text-slate-700 dark:text-slate-300">
                      {testResult?.message || 'กำลังทดสอบเชื่อมต่อไปยัง Supabase REST API...'}
                    </p>
                    {testResult?.missingTables && testResult.missingTables.length > 0 && (
                      <div className="mt-2 text-xs">
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          ตารางที่ยังไม่พบใน Database ({testResult.missingTables.length} ตาราง):
                        </span>{' '}
                        <code className="text-[11px] bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">
                          {testResult.missingTables.join(', ')}
                        </code>
                        <span className="block mt-1 text-slate-600 dark:text-slate-400">
                          👉 สามารถคลิกแท็บ <strong>"SQL Script สร้างตาราง"</strong> แล้วคัดลอกไปรันใน Supabase Dashboard ได้ทันที
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={runTestConnection}
                    disabled={isTesting}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>ทดสอบการเชื่อมต่อใหม่</span>
                  </button>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Local App Storage */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-500" /> ข้อมูลในแอปปัจจุบัน (Local / In-Memory)
                    </span>
                    <span className="text-[11px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                      พร้อมซิงค์
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">เที่ยวรถขนส่ง (Trips)</div>
                      <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {trips.length.toLocaleString()} <span className="text-xs font-normal text-slate-400">รายการ</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">ประวัติน้ำมันดีเซล</div>
                      <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {dieselPrices.length} <span className="text-xs font-normal text-slate-400">วัน</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">Rate Cards (26 ปลายทาง)</div>
                      <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {Object.keys(rateCards).length || 5} <span className="text-xs font-normal text-slate-400">ประเภทรถ (4W, 6W, 10W, OD4, OD6)</span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">จับคู่โซน & สัญญา</div>
                      <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {zoneMappings.length + quotations.length} <span className="text-xs font-normal text-slate-400">กฎ/ใบเสนอราคา</span>
                      </div>
                    </div>
                  </div>

                  {/* Push Action */}
                  <button
                    onClick={handlePushData}
                    disabled={isSyncingPush}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <UploadCloud className={`w-4 h-4 ${isSyncingPush ? 'animate-bounce' : ''}`} />
                    <span>
                      {isSyncingPush ? 'กำลังอัปโหลดข้อมูลไปยัง Supabase Cloud...' : 'อัปโหลดข้อมูลทั้งหมดไปเก็บไว้บน Supabase (Cloud Push)'}
                    </span>
                  </button>
                </div>

                {/* Supabase Cloud Storage */}
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-emerald-500" /> ฐานข้อมูลบน Supabase Cloud
                    </span>
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                      Online 24/7
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    ข้อมูลจะถูกเก็บรักษาอย่างปลอดภัยในระบบ PostgreSQL ของ Supabase สามารถเปิดเข้าใช้งานได้จากทุกอุปกรณ์
                    และหมดปัญหาข้อจำกัดของพื้นที่ LocalStorage โดยสิ้นเชิง
                  </p>

                  <div className="pt-2 space-y-2">
                    <button
                      onClick={handlePullData}
                      disabled={isSyncingPull}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <DownloadCloud className={`w-4 h-4 ${isSyncingPull ? 'animate-bounce' : ''}`} />
                      <span>
                        {isSyncingPull ? 'กำลังดึงข้อมูลจาก Cloud...' : 'ดึงข้อมูลจาก Supabase Cloud มาแสดงผลในแอป (Cloud Pull)'}
                      </span>
                    </button>

                    <button
                      onClick={handleClearCloudTrips}
                      disabled={isClearingTrips}
                      className="w-full py-2 px-3 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800/60 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>ล้างข้อมูลเที่ยวรถทั้งหมดใน Supabase Cloud</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Instructions steps */}
              <div className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <h5 className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> ขั้นตอนการเชื่อมต่อสมบูรณ์ 100%:
                </h5>
                <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-relaxed">
                  <li>
                    ไปที่แท็บ <strong>"SQL Script สร้างตาราง"</strong> ด้านบน และกดปุ่ม <strong>"คัดลอก SQL ทั้งหมด"</strong>
                  </li>
                  <li>
                    เปิดหน้าเว็บ{' '}
                    <a
                      href="https://supabase.com/dashboard/project/dwpremcqguvpeheynvsk/sql"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 font-semibold underline inline-flex items-center gap-0.5"
                    >
                      Supabase SQL Editor <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>วางโค้ด SQL ที่คัดลอกมาลงในช่อง แล้วกดปุ่ม <strong>"Run"</strong> เพื่อสร้างตารางทั้ง 7 ตารางพร้อม Index และ RLS ทันที</li>
                  <li>
                    กลับมาที่หน้านี้ แล้วกดปุ่ม <strong>"อัปโหลดข้อมูลทั้งหมดไปเก็บไว้บน Supabase (Cloud Push)"</strong> เพื่อส่งข้อมูลขึ้นคลาวด์!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: SQL SCHEMA GENERATOR */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    คำสั่ง SQL สำหรับสร้าง Table, Columns, Indexes, RLS Policies ครบถ้วน
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    รองรับ: transport_trips, transport_diesel_prices, transport_rate_cards, transport_zone_mappings, transport_quotations, transport_fixed_customers
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySql}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSql ? 'คัดลอกแล้ว!' : 'คัดลอก SQL ทั้งหมด'}</span>
                  </button>

                  <a
                    href="https://supabase.com/dashboard/project/dwpremcqguvpeheynvsk/sql"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <span>เปิด Supabase SQL Editor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Code viewer box */}
              <div className="relative">
                <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[460px] leading-relaxed border border-slate-800 select-all">
                  <code>{SUPABASE_DATABASE_SCHEMA_SQL}</code>
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: SETTINGS (URL & ANON KEY) */}
          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-2xl">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Supabase Project URL:
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://dwpremcqguvpeheynvsk.supabase.co"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono focus:outline-hidden focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500">
                  (ระบบจะตัด <code>/rest/v1</code> ต่อท้ายออกให้อัตโนมัติ เพื่อให้เชื่อมต่อได้ถูกต้อง)
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Anon / Public API Key:
                </label>
                <textarea
                  rows={3}
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="autosync"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="autosync" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  ซิงค์ข้อมูลกับ Supabase โดยอัตโนมัติเมื่อมีการนำเข้าไฟล์ Excel หรือบันทึก Master Data
                </label>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Zap className="w-4 h-4" />
                  <span>บันทึกการตั้งค่า</span>
                </button>

                <button
                  onClick={runTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>ทดสอบเชื่อมต่อ</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Supabase Database Client: พร้อมทำงานและเชื่อมโยงกับระบบคำนวณ Billing</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
