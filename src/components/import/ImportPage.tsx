import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Eye,
  Trash2,
} from 'lucide-react';
import { parseUploadedRawData } from '../../services/excelService';
import { RawTripData } from '../../types';

interface ImportPageProps {
  onImportRawData: (trips: RawTripData[]) => void;
  onResetSeedData: () => void;
  currentTripsCount: number;
}

export const ImportPage: React.FC<ImportPageProps> = ({
  onImportRawData,
  onResetSeedData,
  currentTripsCount,
}) => {
  const [activeTab, setActiveTab] = useState<'raw' | 'rateCard' | 'diesel'>('raw');
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<RawTripData[]>([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseUploadedRawData(buffer);
      if (parsed.length === 0) {
        throw new Error('ไม่พบข้อมูลเที่ยวขนส่งในไฟล์ หรือโครงสร้างคอลัมน์ไม่ถูกต้อง');
      }
      setPreviewData(parsed);
      setSuccessMsg(`อ่านข้อมูลสำเร็จพบ ${parsed.length} รายการ พร้อมตรวจสอบก่อน Import`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์ Excel/CSV');
      setPreviewData([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (previewData.length === 0) return;
    onImportRawData(previewData);
    setSuccessMsg(`นำเข้าข้อมูลใหม่สำเร็จ ${previewData.length} รายการเรียบร้อยแล้ว!`);
    setPreviewData([]);
    setFileName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            นำเข้าข้อมูลไฟล์ Excel / CSV (Import Data)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            รองรับ Daily Raw Data (65 คอลัมน์), Rate Card 4W/6W/10W และฐานข้อมูลราคาน้ำมัน
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetSeedData}
            className="px-3.5 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
            title="รีเซ็ตกลับเป็นข้อมูลตัวอย่างตั้งต้น 20 รายการ"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
            รีเซ็ตเป็นข้อมูลตั้งต้น (Seed Data)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 text-xs font-medium">
        <button
          onClick={() => setActiveTab('raw')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'raw'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Daily Raw Data (เที่ยวขนส่งรายวัน)
        </button>
        <button
          onClick={() => setActiveTab('rateCard')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'rateCard'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span>Rate Card (4W / 6W / 10W)</span>
        </button>
        <button
          onClick={() => setActiveTab('diesel')}
          className={`pb-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'diesel'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span>PTT Diesel Price Database</span>
        </button>
      </div>

      {/* Upload Zone */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500'
          }`}
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            {isProcessing ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
            ลากและวางไฟล์ Excel หรือ CSV ที่นี่
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            รองรับไฟล์นามสกุล .xlsx, .xls, .csv ขนาดไม่เกิน 50 MB
          </p>

          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition-colors">
            <FileSpreadsheet className="w-4 h-4" />
            เลือกไฟล์จากอุปกรณ์
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {fileName && (
            <p className="mt-3 text-xs font-medium text-blue-600 dark:text-blue-400">
              ไฟล์ที่เลือก: {fileName}
            </p>
          )}
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {previewData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                ตัวอย่างข้อมูลก่อน Import ({previewData.length} รายการ)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ตรวจสอบความถูกต้องของข้อมูลก่อนยืนยันบันทึก
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewData([])}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                ยืนยัน Import ข้อมูล ({previewData.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-80 border border-slate-200 dark:border-slate-700 rounded-lg">
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
                  <th className="py-2 px-3">Delivery District / Prov</th>
                  <th className="py-2 px-3">Truck Type</th>
                  <th className="py-2 px-3">Driver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                {previewData.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{row.issueDate}</td>
                    <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">{row.jobNo}</td>
                    <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">{row.tripNo}</td>
                    <td className="py-2 px-3 max-w-[180px] truncate">{row.consigneeShipper}</td>
                    <td className="py-2 px-3 max-w-[150px] truncate">{row.pickUpName}</td>
                    <td className="py-2 px-3 max-w-[180px] truncate">{row.deliveryName}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {row.deliveryDistrict} {row.deliveryProvince}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">{row.truckType}</td>
                    <td className="py-2 px-3 whitespace-nowrap">{row.driverName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewData.length > 15 && (
            <p className="text-[11px] text-slate-400 text-center">
              แสดงตัวอย่าง 15 รายการแรกจากทั้งหมด {previewData.length} รายการ
            </p>
          )}
        </div>
      )}

      {/* Current Loaded Information Card */}
      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-white">
              ข้อมูลปัจจุบันในระบบ (Active Dataset)
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              มีทั้งหมด {currentTripsCount} เที่ยวขนส่ง บันทึกใน LocalStorage
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full font-bold text-[10px]">
          พร้อมประมวลผล
        </span>
      </div>
    </div>
  );
};
