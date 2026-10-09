import React, { useState } from 'react';
import { TruckTypeMappingRule } from '../../types';
import { Truck, Plus, Trash2, Edit2, CheckCircle2, XCircle, Search, Save, X, RefreshCw } from 'lucide-react';

interface TruckTypeMappingTabProps {
  mappings: TruckTypeMappingRule[];
  onUpdateMappings: (mappings: TruckTypeMappingRule[]) => void;
}

export const TruckTypeMappingTab: React.FC<TruckTypeMappingTabProps> = ({
  mappings,
  onUpdateMappings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState<'ทั้งหมด' | 'นวนคร' | 'บางบ่อ'>('ทั้งหมด');

  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formRawType, setFormRawType] = useState('');
  const [formStandardType, setFormStandardType] = useState<'4W' | '6W' | '10W' | 'OD4' | 'OD6' | 'OD10'>('4W');
  const [formRateKey, setFormRateKey] = useState('Rate 4W');
  const [formBranch, setFormBranch] = useState<'นวนคร' | 'บางบ่อ' | 'ทั้งหมด'>('ทั้งหมด');
  const [formNotes, setFormNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormRawType('');
    setFormStandardType('4W');
    setFormRateKey('Rate 4W');
    setFormBranch('ทั้งหมด');
    setFormNotes('');
    setIsAdding(true);
  };

  const handleOpenEdit = (rule: TruckTypeMappingRule) => {
    setEditingId(rule.id);
    setFormRawType(rule.rawTruckType);
    setFormStandardType(rule.standardType);
    setFormRateKey(rule.rateKey);
    setFormBranch(rule.branch);
    setFormNotes(rule.notes || '');
    setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRawType.trim()) return;

    if (editingId) {
      // Update
      const updated = mappings.map((m) =>
        m.id === editingId
          ? {
              ...m,
              rawTruckType: formRawType.trim(),
              standardType: formStandardType,
              rateKey: formRateKey.trim(),
              branch: formBranch,
              notes: formNotes.trim(),
            }
          : m
      );
      onUpdateMappings(updated);
    } else {
      // Add
      const newRule: TruckTypeMappingRule = {
        id: `ttm-${Date.now()}`,
        rawTruckType: formRawType.trim(),
        standardType: formStandardType,
        rateKey: formRateKey.trim(),
        branch: formBranch,
        active: true,
        notes: formNotes.trim(),
      };
      onUpdateMappings([newRule, ...mappings]);
    }

    setIsAdding(false);
    setEditingId(null);
  };

  const handleToggleActive = (id: string) => {
    onUpdateMappings(
      mappings.map((m) => (m.id === id ? { ...m, active: !m.active } : m))
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('คุณต้องการลบกฎการจับคู่ประเภทรถนี้หรือไม่?')) {
      onUpdateMappings(mappings.filter((m) => m.id !== id));
    }
  };

  const filteredMappings = mappings.filter((m) => {
    if (filterBranch !== 'ทั้งหมด' && m.branch !== filterBranch && m.branch !== 'ทั้งหมด') {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        m.rawTruckType.toLowerCase().includes(q) ||
        m.rateKey.toLowerCase().includes(q) ||
        (m.notes || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <span>ระบบจัดการประเภทรถ (Truck Type Mapping - Prompt 2.1)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {mappings.length} รายการ
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              จับคู่ชื่อประเภทรถจากระบบ Raw Data (GTT) ไปยังประเภทที่ใช้คำนวณและเรทราคา (Rate Card) แยกตามสาขา นวนคร / บางบ่อ
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            เพิ่มประเภทรถ (Add Mapping)
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อประเภทรถใน GTT เช่น 4W/Single, OD4, Trailer..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 w-full sm:w-auto">
            <span className="text-slate-400 text-[11px] whitespace-nowrap">สาขา:</span>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-lg text-xs">
              {(['ทั้งหมด', 'นวนคร', 'บางบ่อ'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setFilterBranch(b)}
                  className={`px-3 py-1 rounded text-[11px] font-semibold transition ${
                    filterBranch === b
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isAdding && (
        <form
          onSubmit={handleSave}
          className="bg-blue-50/50 dark:bg-blue-950/20 p-5 rounded-xl border border-blue-200 dark:border-blue-900 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              {editingId ? 'แก้ไขการจับคู่ประเภทรถ' : 'เพิ่มกฎการจับคู่ประเภทรถใหม่'}
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                Truck Type (Raw) ใน GTT: *
              </label>
              <input
                type="text"
                required
                value={formRawType}
                onChange={(e) => setFormRawType(e.target.value)}
                placeholder="เช่น 4W/Single Unit, 6W/Trailer"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                ประเภทที่ใช้คำนวณ: *
              </label>
              <select
                value={formStandardType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setFormStandardType(val);
                  setFormRateKey(`Rate ${val}`);
                }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs font-bold"
              >
                <option value="4W">4W (4 ล้อ)</option>
                <option value="6W">6W (6 ล้อ)</option>
                <option value="10W">10W (10 ล้อ)</option>
                <option value="OD4">OD4 (รถซับ 4 ล้อ บางบ่อ)</option>
                <option value="OD6">OD6 (รถซับ 6 ล้อ บางบ่อ)</option>
                <option value="OD10">OD10 (รถซับ 10 ล้อ)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                เรทที่ใช้ (Rate Key): *
              </label>
              <input
                type="text"
                required
                value={formRateKey}
                onChange={(e) => setFormRateKey(e.target.value)}
                placeholder="เช่น Rate 4W, Rate OD6"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                สาขาที่มีผล: *
              </label>
              <select
                value={formBranch}
                onChange={(e) => setFormBranch(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs"
              >
                <option value="ทั้งหมด">ทั้งหมด (All Branches)</option>
                <option value="นวนคร">นวนคร (NLC)</option>
                <option value="บางบ่อ">บางบ่อ (BLC)</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] text-slate-500 mb-1">
                หมายเหตุ / เงื่อนไขเฉพาะ:
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="เช่น ใช้กับสายส่ง NLC หรือ สัญญา Roland บางบ่อ"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              บันทึกการจับคู่
            </button>
          </div>
        </form>
      )}

      {/* Mappings Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Truck Type (Raw) ใน GTT</th>
                <th className="py-3 px-4 text-center">ประเภทที่ใช้คำนวณ</th>
                <th className="py-3 px-4">เรทที่ใช้ (Rate Key)</th>
                <th className="py-3 px-4 text-center">สาขา</th>
                <th className="py-3 px-4">หมายเหตุ</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    ไม่พบรายการประเภทรถที่ตรงกับตัวกรอง
                  </td>
                </tr>
              ) : (
                filteredMappings.map((rule, idx) => (
                  <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold font-mono text-slate-900 dark:text-white">
                      {rule.rawTruckType}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                        {rule.standardType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {rule.rateKey}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.branch === 'นวนคร'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : rule.branch === 'บางบ่อ'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {rule.branch}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {rule.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(rule.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                          rule.active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {rule.active ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(rule)}
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                          title="ลบ"
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
    </div>
  );
};
