import React, { useState, useMemo, useRef } from 'react';
import {
  CalculatedBillingTrip,
  RawTripData,
  PriceComparisonRow,
  DiffStatus,
} from '../../types';
import {
  ComparisonFilterState,
  DEFAULT_COMPARISON_FILTER,
  buildPriceComparisonRows,
  checkTripCompleteness,
  filterComparisonRows,
  exportComparisonToCsv,
} from '../../services/reconciliationService';
import {
  parseUploadedRawData,
  downloadRawData69TemplateExcel,
} from '../../services/excelService';
import {
  getRealisticDiffCheckSampleTrips,
} from '../../services/sampleFilesService';
import {
  Scale,
  Filter,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  FileSpreadsheet,
  FileText,
  BarChart3,
  Building,
  Truck,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  Clock,
  Sparkles,
  Upload,
  Trash2,
  FolderOpen,
  Check,
  CheckCircle,
} from 'lucide-react';

interface PriceComparisonPageProps {
  calculatedTrips: CalculatedBillingTrip[];
  rawTrips: RawTripData[];
  onOpenMasterData?: () => void;
  onOpenQuotationUpload?: () => void;
  onImportTrips?: (newTrips: RawTripData[]) => void;
  onNavigateToImport?: () => void;
  onLoadSampleDiffData?: () => void;
  onClearTrips?: () => void;
}

export const PriceComparisonPage: React.FC<PriceComparisonPageProps> = ({
  calculatedTrips,
  rawTrips,
  onOpenMasterData,
  onOpenQuotationUpload,
  onImportTrips,
  onNavigateToImport,
  onLoadSampleDiffData,
  onClearTrips,
}) => {
  // Filter states
  const [filter, setFilter] = useState<ComparisonFilterState>(DEFAULT_COMPARISON_FILTER);
  const [activeTab, setActiveTab] = useState<'comparison' | 'completeness' | 'analytics'>('comparison');
  const [selectedRowDetail, setSelectedRowDetail] = useState<PriceComparisonRow | null>(null);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  // Direct File Upload & Sample Test states
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // Generate comparison rows
  const allComparisonRows = useMemo(() => {
    return buildPriceComparisonRows(calculatedTrips, rawTrips);
  }, [calculatedTrips, rawTrips]);

  // Completeness check
  const completeness = useMemo(() => {
    return checkTripCompleteness(rawTrips, allComparisonRows);
  }, [rawTrips, allComparisonRows]);

  // Distinct companies for filter dropdown
  const availableCompanies = useMemo(() => {
    const list = new Set<string>();
    allComparisonRows.forEach((r) => {
      if (r.companyName && r.companyName.trim()) {
        list.add(r.companyName.trim());
      }
    });
    return Array.from(list).sort();
  }, [allComparisonRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return filterComparisonRows(allComparisonRows, filter);
  }, [allComparisonRows, filter]);

  // Summary totals for filtered rows
  const summary = useMemo(() => {
    const totalCalculated = filteredRows.reduce((sum, r) => sum + r.calculatedRate, 0);
    const totalBranchSent = filteredRows.reduce((sum, r) => sum + r.branchSentRate, 0);
    const totalDiff = totalCalculated - totalBranchSent;
    const diffPct = totalBranchSent > 0 ? (Math.abs(totalDiff) / totalBranchSent) * 100 : 0;

    const matchCount = filteredRows.filter((r) => r.diffStatus === 'Match').length;
    const minorCount = filteredRows.filter((r) => r.diffStatus === 'MinorDiff').length;
    const majorCount = filteredRows.filter((r) => r.diffStatus === 'MajorDiff').length;

    return {
      totalCalculated,
      totalBranchSent,
      totalDiff,
      diffPct,
      matchCount,
      minorCount,
      majorCount,
      totalCount: filteredRows.length,
    };
  }, [filteredRows]);

  // Analytics: Top 10 companies with highest diff
  const topDiffCompanies = useMemo(() => {
    const compMap = new Map<string, { company: string; diffAmount: number; count: number }>();
    filteredRows.forEach((r) => {
      const existing = compMap.get(r.companyName) || { company: r.companyName, diffAmount: 0, count: 0 };
      existing.diffAmount += Math.abs(r.diffAmount);
      existing.count += 1;
      compMap.set(r.companyName, existing);
    });
    return Array.from(compMap.values())
      .filter((c) => c.diffAmount > 0)
      .sort((a, b) => b.diffAmount - a.diffAmount)
      .slice(0, 10);
  }, [filteredRows]);

  // Branch breakdown
  const branchBreakdown = useMemo(() => {
    const nlc = filteredRows.filter((r) => r.branch === 'นวนคร');
    const blc = filteredRows.filter((r) => r.branch === 'บางบ่อ');

    return {
      nlc: {
        count: nlc.length,
        calc: nlc.reduce((s, r) => s + r.calculatedRate, 0),
        branch: nlc.reduce((s, r) => s + r.branchSentRate, 0),
        diff: nlc.reduce((s, r) => s + Math.abs(r.diffAmount), 0),
      },
      blc: {
        count: blc.length,
        calc: blc.reduce((s, r) => s + r.calculatedRate, 0),
        branch: blc.reduce((s, r) => s + r.branchSentRate, 0),
        diff: blc.reduce((s, r) => s + Math.abs(r.diffAmount), 0),
      },
    };
  }, [filteredRows]);

  // Handlers
  const handleResetFilters = () => {
    setFilter(DEFAULT_COMPARISON_FILTER);
  };

  const handleToggleCompany = (company: string) => {
    setFilter((prev) => {
      const exists = prev.selectedCompanies.includes(company);
      return {
        ...prev,
        selectedCompanies: exists
          ? prev.selectedCompanies.filter((c) => c !== company)
          : [...prev.selectedCompanies, company],
      };
    });
  };

  const handleExportAll = () => {
    exportComparisonToCsv(filteredRows, `price-comparison-all-${Date.now()}.csv`);
  };

  const handleExportDiffOnly = () => {
    const diffRows = filteredRows.filter((r) => r.diffStatus !== 'Match');
    exportComparisonToCsv(diffRows, `price-comparison-diff-only-${Date.now()}.csv`);
  };

  // Direct File Upload Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseUploadedRawData(buffer);
      if (parsed.length === 0) {
        setUploadError('ไม่พบข้อมูลเที่ยวรถในไฟล์ กรุณาตรวจสอบหัวข้อคอลัมน์ (รองรับไฟล์ Excel/CSV 69 คอลัมน์)');
      } else {
        if (onImportTrips) {
          onImportTrips(parsed);
        }
        setUploadSuccess(`นำเข้าสำเร็จ ${parsed.length} รายการ และประมวลผล Diff Check อัตโนมัติเรียบร้อยแล้ว`);
      }
    } catch (err: any) {
      setUploadError(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message || 'ไฟล์ไม่ถูกต้อง'}`);
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Load realistic sample data for instant Diff Check testing
  const handleLoadSample = () => {
    if (onLoadSampleDiffData) {
      onLoadSampleDiffData();
    } else if (onImportTrips) {
      const sample = getRealisticDiffCheckSampleTrips();
      onImportTrips(sample);
    }
    setUploadSuccess('โหลดข้อมูลตัวอย่าง 8 รายการเรียบร้อยแล้ว! (มีทั้ง Roland บางบ่อ ตรงกัน 100%, นวนคร มีส่วนต่าง, ค่าดรอป, ค่า OT, และทริปยกเลิก)');
  };

  const handleDownloadTemplate = () => {
    downloadRawData69TemplateExcel();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
              Prompt 1: Reconciliation Module
            </span>
            <span className="text-xs text-slate-400">• GTT Logistics Billing System</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black flex items-center gap-2.5 text-white">
            <Scale className="w-7 h-7 text-blue-400" />
            ระบบเทียบราคา & ตรวจสอบทริป (Diff Check)
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            เปรียบเทียบราคาที่ระบบคำนวณอัตโนมัติ (Rate Card + น้ำมันเฉลี่ย + จุดส่ง + OT) กับยอดที่สาขา นวนคร (NLC) และบางบ่อ (BLC) ส่งมาตรวจสอบ (Column AX: Truck Charge) พร้อมวิเคราะห์ 8 สาเหตุที่เกิด Diff
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Upload File Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="อัปโหลดไฟล์ Excel / CSV เพื่อทำ Diff Check ทันที"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'กำลังประมวลผล...' : 'อัปโหลดไฟล์ Excel / CSV'}</span>
          </button>

          {/* Load Sample Test Data Button */}
          <button
            onClick={handleLoadSample}
            className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="โหลดชุดข้อมูลตัวอย่างจริง 8 ทริป เพื่อทดสอบ Diff Check"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>ทดสอบด้วยข้อมูลตัวอย่าง</span>
          </button>

          {/* Download Template Button */}
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="ดาวน์โหลดแม่แบบไฟล์ 69 คอลัมน์"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Template 69 คอลัมน์</span>
          </button>

          {/* Clear Diff / Raw Data Button */}
          {onClearTrips && (
            <button
              onClick={() => setShowClearConfirmModal(true)}
              disabled={allComparisonRows.length === 0}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${
                allComparisonRows.length > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/20 active:scale-95'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
              title={
                allComparisonRows.length > 0
                  ? 'ล้างข้อมูลดิฟ (Clear Diff Data) และเที่ยวรถทั้งหมดกลับเป็น 0'
                  : 'ยังไม่มีข้อมูลทริปสำหรับล้าง'
              }
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-200" />
              <span>
                ล้างข้อมูลดิฟ {allComparisonRows.length > 0 ? `(${allComparisonRows.length})` : ''}
              </span>
            </button>
          )}

          {allComparisonRows.length > 0 && (
            <>
              <button
                onClick={handleExportAll}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export ทั้งหมด</span>
              </button>

              <button
                onClick={handleExportDiffOnly}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Export เฉพาะ Diff ({summary.minorCount + summary.majorCount})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {uploadSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{uploadSuccess}</span>
          </div>
          <button
            onClick={() => setUploadSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {uploadError && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{uploadError}</span>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-rose-600 hover:text-rose-900 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* EMPTY STATE HERO BANNER (When trips are 0) */}
      {allComparisonRows.length === 0 && (
        <div className="bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 p-8 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-900/60 shadow-lg text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Scale className="w-8 h-8" />
          </div>

          <div className="max-w-2xl mx-auto space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              ⚡ ระบบ Diff Check พร้อมทำงาน (ยังไม่มีเที่ยวรถในระบบ)
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white pt-1">
              เริ่มต้นตรวจสอบส่วนต่างราคาระหว่าง "ระบบคำนวณ" และ "ยอดแจ้งหนี้สาขา"
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              นำเข้าไฟล์ Excel ข้อมูลเที่ยวรถประจำวัน (Daily Raw Data 69 คอลัมน์) ระบบจะอ่านประเภทรถจาก <strong>Column AW (Truck Type)</strong> และอ่านยอดที่สาขาส่งตรวจจาก <strong>Column AX (Truck Charge)</strong> เพื่อจับคู่เทียบราคากลางและวิเคราะห์สาเหตุของ Diff ให้ทันทีอัตโนมัติ
            </p>
          </div>

          {/* 3 Step Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto text-left text-xs">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
              <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                <span>1. แยกประเภทรถ 4W/6W/10W</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                อ้างอิงจาก Column AW = Truck Type จัดกลุ่มรถ 4 ล้อ, 6 ล้อ, 10 ล้อ และ OD สำหรับคิดฐานเรท
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
              <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>2. จับคู่เทียบยอดสาขา (Col AX)</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                เปรียบเทียบยอดที่คำนวณจาก Rate Card + น้ำมันเฉลี่ย กับยอดแจ้งหนี้สาขา นวนคร (NLC) และบางบ่อ (BLC)
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
              <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>3. วินิจฉัย 8 สาเหตุที่เกิด Diff</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                ตรวจจับอัตโนมัติ: โซนไม่ตรง, ราคาน้ำมันต่าง, ค่าดรอปไม่ครบ, ค่า OT ล่วงเวลา, หรือประเภทรถ
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-blue-600/30"
            >
              <Upload className="w-4 h-4" />
              <span>เลือกไฟล์ Excel / CSV นำเข้าเพื่อ Diff Check ทันที</span>
            </button>

            <button
              onClick={handleLoadSample}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-amber-600/30"
            >
              <Sparkles className="w-4 h-4 text-amber-100" />
              <span>โหลดข้อมูลตัวอย่างทดสอบ Diff Check ทันที</span>
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>ดาวน์โหลดแม่แบบ 69 คอลัมน์ (Template)</span>
            </button>

            {onNavigateToImport && (
              <button
                onClick={onNavigateToImport}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:underline rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <FolderOpen className="w-4 h-4" />
                <span>ไปที่หน้านำเข้าข้อมูลหลัก (Import Data)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveTab('comparison')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'comparison'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>หน้าจอเทียบราคา (Price Comparison)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            {filteredRows.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completeness')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'completeness'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>ตรวจสอบทริปครบถ้วน (Trip Completeness Check)</span>
          {completeness.isAllComplete ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
              ครบ 100%
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold">
              ขาด {completeness.missingTripsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>วิเคราะห์เหตุผล Diff & สถิติ (Diff Analytics)</span>
        </button>
      </div>

      {/* FILTER BAR (Section 1.1) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>ตัวกรองข้อมูล (Filter Bar)</span>
          </div>

          <button
            onClick={handleResetFilters}
            className="text-[11px] text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition"
          >
            <RefreshCw className="w-3 h-3" />
            รีเซ็ตตัวกรอง (Reset)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* 1. Branch: นวนคร NLC | บางบ่อ BLC | ทั้งหมด */}
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">
              สาขา (Branch):
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-lg">
              {(['ทั้งหมด', 'นวนคร', 'บางบ่อ'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setFilter({ ...filter, branch: b })}
                  className={`py-1 text-[11px] rounded font-semibold transition ${
                    filter.branch === b
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {b === 'นวนคร' ? 'นวนคร NLC' : b === 'บางบ่อ' ? 'บางบ่อ BLC' : 'ทั้งหมด'}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Truck Type: 4W | 6W | 10W | OD | ทั้งหมด */}
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">
              ประเภทรถ (Truck Type):
            </label>
            <select
              value={filter.truckType}
              onChange={(e) => setFilter({ ...filter, truckType: e.target.value as any })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="ทั้งหมด">ทั้งหมด (All Types)</option>
              <option value="4W">4W (4 ล้อ)</option>
              <option value="6W">6W (6 ล้อ)</option>
              <option value="10W">10W (10 ล้อ)</option>
              <option value="OD">OD (รถซับคอนแทรคเตอร์ OD4 / OD6)</option>
            </select>
          </div>

          {/* 3. Diff Status: ตรงกัน | ต่างเล็กน้อย | ต่างมาก | ทั้งหมด */}
          <div>
            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">
              สถานะ Diff (Diff Status):
            </label>
            <select
              value={filter.diffStatus}
              onChange={(e) => setFilter({ ...filter, diffStatus: e.target.value as any })}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-medium"
            >
              <option value="ทั้งหมด">ทั้งหมด (All Statuses)</option>
              <option value="Match">🟢 ตรงกัน (Diff = 0)</option>
              <option value="MinorDiff">🟡 ต่างเล็กน้อย (Diff &lt; 5%)</option>
              <option value="MajorDiff">🔴 ต่างมาก (Diff &ge; 5%)</option>
            </select>
          </div>

          {/* 4. Company Multi-Select Dropdown */}
          <div className="relative">
            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">
              บริษัท (Company Multi-select):
            </label>
            <button
              type="button"
              onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs flex items-center justify-between text-left"
            >
              <span className="truncate">
                {filter.selectedCompanies.length === 0
                  ? 'ทุกบริษัท'
                  : `เลือกแล้ว ${filter.selectedCompanies.length} บริษัท`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {isCompanyDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-2 max-h-56 overflow-y-auto space-y-1">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700 text-[10px]">
                  <span className="text-slate-400 font-semibold">รายชื่อบริษัท</span>
                  {filter.selectedCompanies.length > 0 && (
                    <button
                      onClick={() => setFilter({ ...filter, selectedCompanies: [] })}
                      className="text-blue-500 hover:underline"
                    >
                      ล้างที่เลือก
                    </button>
                  )}
                </div>
                {availableCompanies.map((comp) => {
                  const isChecked = filter.selectedCompanies.includes(comp);
                  return (
                    <label
                      key={comp}
                      className="flex items-center gap-2 p-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCompany(comp)}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                      <span className="truncate text-slate-700 dark:text-slate-200">{comp}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Search Bar */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">
              ค้นหา (Trip No. / Job No. / เหตุผล):
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={filter.searchTerm}
                onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
                placeholder="พิมพ์เลขทริป เช่น TRP-GTTD2609..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS (Section 1.1 Layout Requirement) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: ราคาที่ระบบคำนวณ */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-bold mb-1">
              <Layers className="w-4 h-4" />
              <span>ราคาที่ระบบคำนวณ</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              ฿{summary.totalCalculated.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              คำนวณจาก Rate Card + น้ำมันเฉลี่ย + Extra Fees ({summary.totalCount} รายการ)
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300">
            <Building className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: ยอดที่สาขาส่งมา */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-1">
              <Truck className="w-4 h-4" />
              <span>ยอดที่สาขาส่งมาตรวจ</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              ฿{summary.totalBranchSent.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              ยอดแจ้งหนี้จากสาขา นวนคร NLC & บางบ่อ BLC
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
            <Scale className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: ส่วนต่าง (Diff) */}
        <div
          className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between ${
            summary.totalDiff === 0
              ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
              : summary.diffPct < 5
              ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
              : 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
          }`}
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
              {summary.totalDiff > 0 ? (
                <TrendingUp className="w-4 h-4 text-rose-500" />
              ) : summary.totalDiff < 0 ? (
                <TrendingDown className="w-4 h-4 text-emerald-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              <span>ส่วนต่างสุทธิ (Net Diff)</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {summary.totalDiff > 0 ? '+' : ''}฿
                {Math.abs(summary.totalDiff).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
              <span
                className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                  summary.diffPct === 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : summary.diffPct < 5
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {summary.diffPct.toFixed(2)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              🟢 ตรง {summary.matchCount} | 🟡 เล็กน้อย {summary.minorCount} | 🔴 ตรวจสอบ {summary.majorCount}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${
              summary.diffPct === 0
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                : summary.diffPct < 5
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300'
            }`}
          >
            {summary.diffPct === 0 ? 'MATCH' : `DIFF`}
          </div>
        </div>
      </div>

      {/* CHECKLIST BANNER (Section 1.2: Checklist ทริปครบ) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-white">
              Checklist ความครบถ้วนของทริป (Trip Completeness Checklist):
            </span>
            {completeness.isAllComplete ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                ✅ ครบทุกทริป (100% Complete)
              </span>
            ) : completeness.missingTripsCount > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                ⚠️ ขาด {completeness.missingTripsCount} ทริป
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                ❌ ไม่มีข้อมูลเปรียบเทียบ
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            เกณฑ์นับ: 1 ทริป = 1 Trip No. (ไม่ซ้ำ) • ทริปที่มีหลาย Job นับเป็น 1 ทริป
          </div>
        </div>

        {/* Status Breakdown Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-500 block">FinishTrip (นับรวม)</span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {completeness.finishTripsCount}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-500 block">TripPlan (รอตรวจ)</span>
            <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
              {completeness.tripPlanCount}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-500 block">Cancelled (หักออก)</span>
            <span className="text-base font-extrabold text-rose-600 dark:text-rose-400">
              {completeness.cancelledTripsCount}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-500 block">Backhaul (เที่ยวกลับ)</span>
            <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
              {completeness.backhaulCount}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-500 block">Missing Price</span>
            <span className="text-base font-extrabold text-purple-600 dark:text-purple-400">
              {completeness.missingPriceCount}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-500 block">ขาดราคาน้ำมัน</span>
            <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
              {completeness.missingFuelCount}
            </span>
          </div>
        </div>
      </div>

      {/* TAB 1: COMPARISON BREAKDOWN TABLE */}
      {activeTab === 'comparison' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>ตารางเปรียบเทียบราคา & วิเคราะห์ Diff (Diff Breakdown Table)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  (แสดง {filteredRows.length} จาก {allComparisonRows.length} รายการ)
                </span>
              </h2>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  เขียว = ตรงกัน (0%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  เหลือง = ต่างเล็กน้อย (&lt; 5%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  แดง = ต่างมาก (&ge; 5%) ต้องตรวจสอบ
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              คลิกแถวหรือปุ่ม <Eye className="w-3 h-3 inline mx-0.5 text-blue-500" /> เพื่อดู Breakdown เจาะลึก
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="py-3 px-3 font-semibold">Issue Date</th>
                  <th className="py-3 px-3 font-semibold">Job No.</th>
                  <th className="py-3 px-3 font-semibold">Trip No.</th>
                  <th className="py-3 px-3 font-semibold">บริษัท (Customer)</th>
                  <th className="py-3 px-3 font-semibold">สาขา</th>
                  <th className="py-3 px-3 font-semibold">ประเภทรถ</th>
                  <th className="py-3 px-3 font-semibold text-right">ราคาระบบ</th>
                  <th className="py-3 px-3 font-semibold text-right">ยอดสาขา</th>
                  <th className="py-3 px-3 font-semibold text-right">Diff (บาท)</th>
                  <th className="py-3 px-3 font-semibold text-right">Diff (%)</th>
                  <th className="py-3 px-3 font-semibold text-center">สถานะ</th>
                  <th className="py-3 px-4 font-semibold">เหตุผลที่ Diff (Auto-diagnosed)</th>
                  <th className="py-3 px-3 font-semibold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      {allComparisonRows.length === 0 ? (
                        <div className="space-y-3">
                          <p className="text-slate-500 font-medium">ยังไม่มีข้อมูลเที่ยวรถในระบบสำหรับการเทียบราคา</p>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                            >
                              📂 อัปโหลดไฟล์ Excel (69 คอลัมน์)
                            </button>
                            <button
                              onClick={handleLoadSample}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
                            >
                              ⚡ โหลดข้อมูลตัวอย่างทดสอบ Diff
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p>ไม่พบรายการที่ตรงกับตัวกรอง (มีข้อมูลในระบบ {allComparisonRows.length} รายการ)</p>
                          <button
                            onClick={handleResetFilters}
                            className="px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-blue-600 hover:text-white rounded text-xs transition"
                          >
                            รีเซ็ตตัวกรองทั้งหมด (Reset Filters)
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const isMatch = row.diffStatus === 'Match';
                    const isMinor = row.diffStatus === 'MinorDiff';
                    const isMajor = row.diffStatus === 'MajorDiff';

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedRowDetail(row)}
                        className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 ${
                          isMajor
                            ? 'bg-rose-50/20 dark:bg-rose-950/10'
                            : isMinor
                            ? 'bg-amber-50/15 dark:bg-amber-950/10'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {row.issueDate}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {row.jobNo}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">
                          {row.tripNo}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white max-w-[180px] truncate">
                          {row.companyName}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.branch === 'นวนคร'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            }`}
                          >
                            {row.branch}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {row.truckType}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ฿{row.calculatedRate.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          ฿{row.branchSentRate.toLocaleString()}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            isMatch
                              ? 'text-emerald-600'
                              : isMinor
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {row.diffAmount > 0 ? '+' : ''}
                          ฿{row.diffAmount.toLocaleString()}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-extrabold whitespace-nowrap ${
                            isMatch
                              ? 'text-emerald-600'
                              : isMinor
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {row.diffPercent.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isMatch ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              🟢 ตรงกัน
                            </span>
                          ) : isMinor ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              🟡 ต่างเล็กน้อย
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              🔴 ต่างมาก
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 text-[11px] max-w-xs truncate">
                          {row.primaryReason}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRowDetail(row);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                            title="ดูรายละเอียดการคิดเงินและเหตุผล Diff"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TRIP COMPLETENESS CHECK (Section 1.2) */}
      {activeTab === 'completeness' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              รายงานการตรวจสอบทริปครบถ้วน (Trip Completeness Check)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              ระบบตรวจสอบเปรียบเทียบ Trip No. ในไฟล์ Raw Data กับยอดที่สาขาส่งมา เพื่อป้องกันการตกหล่นของเที่ยวขนส่ง หรือการคิดค่าบริการซ้ำซ้อน
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 block mb-1">จำนวนทริปที่ควรมี (Raw Data):</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {completeness.totalExpectedTrips} ทริป
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">1 ทริป = 1 Trip No. (หัก Job ซ้ำแล้ว)</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 block mb-1">จำนวนทริปที่ตรวจพบในยอดสาขา:</span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                  {completeness.totalActualTrips} ทริป
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">เทียบได้ {((completeness.totalActualTrips / (completeness.totalExpectedTrips || 1)) * 100).toFixed(0)}% ของข้อมูลทั้งหมด</span>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  completeness.missingTripsCount === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                }`}
              >
                <span className="text-xs font-semibold block mb-1 text-slate-700 dark:text-slate-300">
                  ทริปที่ขาดหาย (Missing Trips):
                </span>
                <span
                  className={`text-2xl font-black font-mono ${
                    completeness.missingTripsCount === 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {completeness.missingTripsCount} ทริป
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  {completeness.missingTripsCount === 0 ? 'ข้อมูลครบถ้วนสมบูรณ์' : 'ต้องติดตามเอกสารจากสาขา'}
                </span>
              </div>
            </div>

            {/* Missing Trips List if any */}
            {completeness.missingTripsCount > 0 ? (
              <div className="mt-4 p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 space-y-2">
                <h3 className="text-xs font-bold text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  รายการ Trip No. ที่พบใน Raw Data แต่ไม่มียอดที่สาขาส่งมาตรวจ:
                </h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  {completeness.missingTripNos.map((tn) => (
                    <span
                      key={tn}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded text-xs font-mono text-rose-700 dark:text-rose-300"
                    >
                      {tn}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs text-emerald-800 dark:text-emerald-200">
                  <strong>ยอดเยี่ยม!</strong> ไม่พบทริปที่ขาดหาย ทริปทั้งหมดใน Raw Data ({completeness.totalExpectedTrips} ทริป) มีการส่งยอดและคำนวณครบถ้วนสมบูรณ์
                </div>
              </div>
            )}
          </div>

          {/* Special Trip Status Rules Reference (Section 1.2 Table) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              เกณฑ์การจัดการทริปสถานะพิเศษ (Special Trip Status Handling Matrix)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-200 dark:border-slate-700 rounded-lg">
                <thead className="bg-slate-50 dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">สถานะ (Trip Status)</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">การจัดการในระบบ</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">คำอธิบายและแนวทางปฏิบัติ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  <tr>
                    <td className="p-3 font-semibold text-emerald-600">FinishTrip</td>
                    <td className="p-3">✅ นับรวม 100%</td>
                    <td className="p-3 text-slate-500">ทริปสำเร็จ ส่งสินค้าและเซ็นเอกสารครบถ้วน นำมาคิดค่าบริการเต็มจำนวน</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-amber-600">TripPlan</td>
                    <td className="p-3">⚠️ รอตรวจสอบ</td>
                    <td className="p-3 text-slate-500">งานวางแผนวิ่ง แต่ยังไม่ยืนยันสถานะ Finish ตรวจสอบว่าวิ่งจริงหรือยกเลิก</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-rose-600">Cancelled</td>
                    <td className="p-3">❌ หักออก</td>
                    <td className="p-3 text-slate-500">ทริปยกเลิก ไม่นำมาคิดยอดวางบิล เว้นแต่มีเงื่อนไขคิดค่ายกเลิกหน้างาน</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-blue-600">Backhaul</td>
                    <td className="p-3">⚙️ คิดตามเงื่อนไข (เต็ม/ครึ่ง)</td>
                    <td className="p-3 text-slate-500">เที่ยวขากลับ คิด 50% ของเรทเที่ยวไป หรือคิดเต็มหากมีสินค้าบรรทุก</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-purple-600">Missing Price</td>
                    <td className="p-3">⚠️ ใช้ราคาประมาณการ</td>
                    <td className="p-3 text-slate-500">ใช้เรทเฉลี่ยตามประเภทรถและโซน หรือเทียบจากประวัติเที่ยวเดิม</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-indigo-600">ไม่มีราคาน้ำมัน</td>
                    <td className="p-3">⚠️ ใช้ Monthly Average แทน</td>
                    <td className="p-3 text-slate-500">แก้ปัญหาด้วยการดึงราคาน้ำมันเฉลี่ยรายเดือน ปตท. (40.69 ฿/L) อัตโนมัติ</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DIFF ANALYTICS (Section 1.3 & Section 1.5) */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Branch Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                  สาขานวนคร (NLC - Navanakorn)
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-bold px-2 py-0.5 rounded">
                  แปลงข้อมูลใน Excel แล้ว
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                นำข้อมูลมาแปลงไว้ที่ไฟล์ Excel แล้ว มีราคาของแต่ละประเภทรถ (4W, 6W, 10W) ตามเรทราคา สาขาส่งยอดมาให้ตรวจสอบเทียบกับเรทมาตรฐาน
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">จำนวนทริป</span>
                  <span className="font-bold text-slate-800 dark:text-white">{branchBreakdown.nlc.count}</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">ราคาระบบ</span>
                  <span className="font-bold text-slate-800 dark:text-white">฿{Math.round(branchBreakdown.nlc.calc).toLocaleString()}</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Diff รวม</span>
                  <span className="font-bold text-amber-600">฿{Math.round(branchBreakdown.nlc.diff).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-purple-600 dark:text-purple-400">
                  สาขาบางบ่อ (BLC - Bang Bo)
                </span>
                <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 font-bold px-2 py-0.5 rounded">
                  มีตัวอย่างของ Roland ชัดเจน
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                สาขาส่งยอดมาให้ตรวจสอบ โดยเฉพาะลูกค้าราย Roland ที่มีตัวอย่าง/สัญญาชัดเจน ส่วนลูกค้ารายอื่นเทียบกับ Rate Card และข้อตกลงพิเศษ
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">จำนวนทริป</span>
                  <span className="font-bold text-slate-800 dark:text-white">{branchBreakdown.blc.count}</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">ราคาระบบ</span>
                  <span className="font-bold text-slate-800 dark:text-white">฿{Math.round(branchBreakdown.blc.calc).toLocaleString()}</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-700/40 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Diff รวม</span>
                  <span className="font-bold text-amber-600">฿{Math.round(branchBreakdown.blc.diff).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top 10 Companies With Highest Diff (Prompt 1.5 Requirement) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Top 10 บริษัทที่มีมูลค่า Diff มากสุด (Top Variance Customers)
              </span>
              <span className="text-xs text-slate-400">เรียงตามมูลค่าส่วนต่าง (บาท)</span>
            </h2>

            <div className="space-y-3">
              {topDiffCompanies.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  ไม่พบบริษัทที่มีส่วนต่าง (Diff) ทุกรายการตรงกัน 100%
                </div>
              ) : (
                topDiffCompanies.map((item, idx) => {
                  const maxDiff = topDiffCompanies[0]?.diffAmount || 1;
                  const pctWidth = Math.min(100, Math.round((item.diffAmount / maxDiff) * 100));

                  return (
                    <div key={item.company} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {idx + 1}
                          </span>
                          {item.company}
                          <span className="text-[10px] text-slate-400 font-normal">({item.count} ทริป)</span>
                        </span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          ฿{item.diffAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                          style={{ width: `${pctWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL (Row Click Inspector) */}
      {selectedRowDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 max-w-2xl w-full rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                  Trip Breakdown & Diff Reason Inspector
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                  <span>Trip: {selectedRowDetail.tripNo}</span>
                  <span className="text-xs font-normal text-slate-500">({selectedRowDetail.jobNo})</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedRowDetail(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Trip Overview Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">บริษัท</span>
                  <span className="font-semibold text-slate-800 dark:text-white line-clamp-1">
                    {selectedRowDetail.companyName}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">สาขา</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {selectedRowDetail.branch}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">ประเภทรถ</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {selectedRowDetail.truckType}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">โซนปลายทาง</span>
                  <span className="font-semibold text-slate-800 dark:text-white line-clamp-1">
                    {selectedRowDetail.deliveryZone || '-'}
                  </span>
                </div>
              </div>

              {/* Price Comparison Summary */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">ราคาระบบคำนวณ</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    ฿{selectedRowDetail.calculatedRate.toLocaleString()}
                  </span>
                </div>

                <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />

                <div>
                  <span className="text-[10px] text-slate-400 block">ยอดสาขาส่งมา</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    ฿{selectedRowDetail.branchSentRate.toLocaleString()}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">ส่วนต่าง (Diff)</span>
                  <span
                    className={`text-xl font-black font-mono ${
                      selectedRowDetail.diffStatus === 'Match'
                        ? 'text-emerald-600'
                        : selectedRowDetail.diffStatus === 'MinorDiff'
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {selectedRowDetail.diffAmount > 0 ? '+' : ''}฿
                    {selectedRowDetail.diffAmount.toLocaleString()} ({selectedRowDetail.diffPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Auto Diagnosed Reasons */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  การวินิจฉัยเหตุผลที่เกิด Diff (Diff Reason Breakdown):
                </h4>
                <div className="space-y-1.5">
                  {selectedRowDetail.diffReasons.map((r, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 flex items-start gap-2"
                    >
                      <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw details if available */}
              {selectedRowDetail.rawTrip && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <div><strong>จุดรับ:</strong> {selectedRowDetail.rawTrip.pickUpName} ({selectedRowDetail.rawTrip.pickUpProvince})</div>
                  <div><strong>จุดส่ง:</strong> {selectedRowDetail.rawTrip.deliveryName} ({selectedRowDetail.rawTrip.deliveryDistrict}, {selectedRowDetail.rawTrip.deliveryProvince})</div>
                  {selectedRowDetail.rawTrip.deliveryRemark && (
                    <div><strong>หมายเหตุ:</strong> {selectedRowDetail.rawTrip.deliveryRemark}</div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              {onOpenMasterData && (
                <button
                  onClick={() => {
                    setSelectedRowDetail(null);
                    onOpenMasterData();
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  ไปที่หน้าข้อมูลหลัก (Master Data) เพื่อแก้ไขเรท
                </button>
              )}
              <button
                onClick={() => setSelectedRowDetail(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 ml-auto"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Diff / Raw Data Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-rose-50/70 dark:bg-rose-950/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ยืนยันการล้างข้อมูลดิฟ (Clear Diff Data)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ล้างข้อมูลเที่ยวรถและตารางผลเปรียบเทียบราคากลับเป็น 0
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>
                คุณต้องการล้างข้อมูลเที่ยวรถทั้งหมดจำนวน{' '}
                <strong className="text-rose-600 dark:text-rose-400 font-bold">
                  {allComparisonRows.length} รายการ
                </strong>{' '}
                ออกจากระบบเปรียบเทียบราคา (Diff Check) ใช่หรือไม่?
              </p>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">จำนวนทริปทั้งหมด:</span>
                  <span className="font-semibold">{allComparisonRows.length} เที่ยว</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ยอดคำนวณระบบ:</span>
                  <span className="font-semibold">
                    ฿{summary.totalCalculated.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ยอดสาขาส่งตรวจ:</span>
                  <span className="font-semibold">
                    ฿{summary.totalBranchSent.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ผลต่างสุทธิ (Diff):</span>
                  <span
                    className={`font-semibold ${
                      summary.totalDiff !== 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
                    }`}
                  >
                    ฿{Math.abs(summary.totalDiff).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                * หมายเหตุ: การล้างข้อมูลจะเคลียร์ข้อมูลเที่ยวรถใน LocalStorage กลับเป็น 0 โดยไม่กระทบฐานข้อมูล Rate Card และราคาน้ำมัน คุณสามารถนำเข้าไฟล์ใหม่หรือคลิก "ทดสอบด้วยข้อมูลตัวอย่าง" ได้ทุกเมื่อ
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  setShowClearConfirmModal(false);
                  if (onClearTrips) {
                    onClearTrips();
                    setUploadSuccess('ล้างข้อมูลดิฟเรียบร้อยแล้ว รายการเที่ยวรถทั้งหมดถูกรีเซ็ตกลับเป็น 0 รายการ');
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันล้างข้อมูลดิฟ (เป็น 0)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
