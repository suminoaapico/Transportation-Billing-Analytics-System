import React, { useState, useEffect } from 'react';
import {
  Cloud,
  FileSpreadsheet,
  Check,
  X,
  ExternalLink,
  HardDrive,
  Download,
  FileText,
  Truck,
  Fuel,
  Sparkles,
  Layers,
  ArrowDownToLine,
  RefreshCw,
} from 'lucide-react';
import { DriveUploadedFile, listDriveFiles } from '../../services/googleDriveService';
import {
  SAMPLE_FILES_CATALOG,
  downloadSampleTripsExcel,
  downloadQuotationTemplateExcel,
  downloadRateCardMasterExcel,
  downloadDieselDatabaseExcel,
} from '../../services/sampleFilesService';
import { RawTripData } from '../../types';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  tripCount: number;
  totalAmount: number;
  onConfirmUpload: () => Promise<void>;
  isUploading: boolean;
  uploadedFile: DriveUploadedFile | null;
  onImportSampleTrips?: (trips: RawTripData[]) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  fileName,
  tripCount,
  totalAmount,
  onConfirmUpload,
  isUploading,
  uploadedFile,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'samples' | 'files'>('upload');
  const [driveFiles, setDriveFiles] = useState<DriveUploadedFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDriveFiles();
    }
  }, [isOpen, uploadedFile]);

  const loadDriveFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await listDriveFiles();
      setDriveFiles(files);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleDownloadSample = (fileId: string) => {
    let name = '';
    if (fileId === 'sample-trips-sep2026') {
      downloadSampleTripsExcel();
      name = 'Transportation_Raw_Trips_Sep2026.xlsx';
    } else if (fileId === 'sample-quotations-template') {
      downloadQuotationTemplateExcel();
      name = 'Quotation_Master_Template_2026.xlsx';
    } else if (fileId === 'sample-ratecard-standard') {
      downloadRateCardMasterExcel();
      name = 'RateCard_Standard_16Brackets.xlsx';
    } else if (fileId === 'sample-diesel-ptt-sep2026') {
      downloadDieselDatabaseExcel();
      name = 'PTT_Diesel_Database_Sep2026.xlsx';
    }

    if (name) {
      setDownloadSuccessMessage(`ดาวน์โหลด ${name} เรียบร้อยแล้ว`);
      setTimeout(() => setDownloadSuccessMessage(null), 3500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Google Drive & ข้อมูลตัวอย่าง (Sample Files)</h3>
              <p className="text-xs text-blue-100">บันทึกรายงานลง Google Drive และดาวน์โหลดชุดข้อมูลตัวอย่าง</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-6 text-xs font-semibold shrink-0 bg-slate-50 dark:bg-slate-800/80">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>บันทึกลง Google Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('samples')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'samples'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
            <span>ไฟล์ตัวอย่าง & เอกสารต้นแบบ ({SAMPLE_FILES_CATALOG.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'files'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>คลังไฟล์ใน Drive ({driveFiles.length})</span>
          </button>
        </div>

        {/* Toast inside modal */}
        {downloadSuccessMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 px-6 py-2 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-1.5 font-medium">
              <Check className="w-4 h-4 text-emerald-600" /> {downloadSuccessMessage}
            </span>
            <button onClick={() => setDownloadSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {/* TAB 1: UPLOAD CURRENT REPORT */}
          {activeTab === 'upload' && (
            <div>
              {uploadedFile ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <Check className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                    บันทึกไฟล์ลง Google Drive สำเร็จ!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                    รายงานสรุปค่าขนส่งถูกจัดเก็บบน Google Drive เรียบร้อยแล้ว สามารถเปิดดูหรือดาวน์โหลดได้ทันที
                  </p>

                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-600 text-left mb-5 flex items-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-emerald-600 shrink-0" />
                    <div className="overflow-hidden flex-1">
                      <p className="text-xs font-semibold text-slate-800 dark:text-white truncate font-mono">
                        {uploadedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Microsoft Excel Worksheet (.xlsx) {uploadedFile.isSimulated && '• โหมดทดสอบ / Local Drive'}
                      </p>
                    </div>
                    {uploadedFile.downloadUrl && (
                      <a
                        href={uploadedFile.downloadUrl}
                        download={uploadedFile.name}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-slate-600 rounded-lg transition-colors"
                        title="ดาวน์โหลดไฟล์นี้ลงเครื่อง"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    {uploadedFile.webViewLink && (
                      <a
                        href={uploadedFile.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        เปิดไฟล์ใน Google Drive
                      </a>
                    )}
                    <button
                      onClick={() => setActiveTab('files')}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      ดูรายการไฟล์ทั้งหมด
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3.5 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl">
                    <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                      <p className="font-bold mb-0.5">ยืนยันการจัดเก็บบน Google Drive Cloud Storage:</p>
                      <p className="text-[11px]">
                        ระบบจะส่งออกรายงาน <strong>Automated Transportation Billing Report</strong> ครบทุกชีต (Summary, Details 24 คอลัมน์, และ Diff Reconciliation) บันทึกเป็นไฟล์ Excel (.xlsx)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-700/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400">ชื่อไฟล์ที่จัดเก็บ:</span>
                      <span className="font-bold text-slate-800 dark:text-white font-mono">{fileName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400">จำนวนเที่ยวขนส่งในรายงาน:</span>
                      <span className="font-bold text-slate-800 dark:text-white">{tripCount} เที่ยว</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400">ยอดรวมค่าขนส่งสุทธิ:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-sm">
                        ฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('samples')}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      ต้องการดาวน์โหลดไฟล์ตัวอย่างอื่น ๆ? &rarr;
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={isUploading}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        onClick={onConfirmUpload}
                        disabled={isUploading}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-60"
                      >
                        {isUploading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            กำลังอัปโหลด...
                          </>
                        ) : (
                          <>
                            <Cloud className="w-4 h-4" />
                            บันทึกลง Google Drive
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAMPLE FILES & TEMPLATES CATALOG */}
          {activeTab === 'samples' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-700/60 dark:to-slate-700/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    คลังข้อมูลตัวอย่าง & ไฟล์ต้นแบบ (Sample Datasets & Templates)
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    สามารถคลิกดาวน์โหลดเป็นไฟล์ Microsoft Excel (.xlsx) เพื่อนำไปใช้งานหรือทดสอบระบบได้ทันที
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {SAMPLE_FILES_CATALOG.map((file) => (
                  <div
                    key={file.id}
                    className="p-4 bg-white dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-blue-400 transition-all shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg shrink-0 mt-0.5">
                          {file.category === 'raw_trips' && <Truck className="w-5 h-5" />}
                          {file.category === 'quotation' && <FileText className="w-5 h-5" />}
                          {file.category === 'rate_card' && <Layers className="w-5 h-5" />}
                          {file.category === 'diesel' && <Fuel className="w-5 h-5" />}
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-800 dark:text-white font-mono text-xs">
                            {file.name}
                          </h5>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {file.description}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownloadSample(file.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
                        title="ดาวน์โหลดไฟล์ Excel นี้"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลด (.xlsx)</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-600/50">
                      <span className="text-[10px] text-slate-400 font-mono">ขนาด: {file.sizeStr}</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-[10px] text-slate-400">{file.recordCount} แถว</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      {file.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DRIVE FILES STORAGE */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white text-xs">
                    รายการไฟล์ที่จัดเก็บบน Google Drive
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ไฟล์รายงานค่าขนส่งที่ถูกบันทึกลงบนคลาวด์ของคุณ
                  </p>
                </div>
                <button
                  onClick={loadDriveFiles}
                  disabled={isLoadingFiles}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="รีเฟรชรายการไฟล์"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {driveFiles.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <Cloud className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500">ยังไม่มีประวัติไฟล์ที่บันทึกบน Google Drive</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 mt-1"
                  >
                    บันทึกรายงานปัจจุบันเดี๋ยวนี้
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {driveFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 bg-white dark:bg-slate-700/60 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div className="overflow-hidden">
                          <p className="font-semibold text-slate-800 dark:text-white truncate font-mono">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {file.createdTime ? new Date(file.createdTime).toLocaleString('th-TH') : 'บันทึกในระบบ'}
                            {file.isSimulated && ' • Local Drive Simulation'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {file.downloadUrl && (
                          <a
                            href={file.downloadUrl}
                            download={file.name}
                            className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                            title="ดาวน์โหลดไฟล์นี้"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors"
                            title="เปิดดูใน Google Drive"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
