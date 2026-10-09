import React, { useState } from 'react';
import { ConditionRule } from '../../types';
import { Settings, Plus, Trash2, Edit2, Search, Save, X, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react';

interface ConditionRuleTabProps {
  conditions: ConditionRule[];
  onUpdateConditions: (rules: ConditionRule[]) => void;
}

export const ConditionRuleTab: React.FC<ConditionRuleTabProps> = ({
  conditions,
  onUpdateConditions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState<'ทั้งหมด' | 'นวนคร' | 'บางบ่อ'>('ทั้งหมด');

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formCode, setFormCode] = useState('C09');
  const [formName, setFormName] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formApplicableTo, setFormApplicableTo] = useState('ทั้งหมด');
  const [formBranch, setFormBranch] = useState<'นวนคร' | 'บางบ่อ' | 'ทั้งหมด'>('ทั้งหมด');
  const [formNotes, setFormNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    const nextCodeNum = conditions.length + 1;
    setFormCode(`C${String(nextCodeNum).padStart(2, '0')}`);
    setFormName('');
    setFormValue('');
    setFormApplicableTo('ทั้งหมด');
    setFormBranch('ทั้งหมด');
    setFormNotes('');
    setIsAdding(true);
  };

  const handleOpenEdit = (rule: ConditionRule) => {
    setEditingId(rule.id);
    setFormCode(rule.code);
    setFormName(rule.conditionName);
    setFormValue(rule.value);
    setFormApplicableTo(rule.applicableTo);
    setFormBranch(rule.branch);
    setFormNotes(rule.notes);
    setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formValue.trim()) return;

    if (editingId) {
      const updated = conditions.map((c) =>
        c.id === editingId
          ? {
              ...c,
              code: formCode.trim(),
              conditionName: formName.trim(),
              value: formValue.trim(),
              applicableTo: formApplicableTo.trim(),
              branch: formBranch,
              notes: formNotes.trim(),
              updatedAt: new Date().toISOString(),
            }
          : c
      );
      onUpdateConditions(updated);
    } else {
      const newRule: ConditionRule = {
        id: `cond-${Date.now()}`,
        code: formCode.trim(),
        conditionName: formName.trim(),
        value: formValue.trim(),
        applicableTo: formApplicableTo.trim(),
        branch: formBranch,
        notes: formNotes.trim(),
        active: true,
        updatedAt: new Date().toISOString(),
      };
      onUpdateConditions([...conditions, newRule]);
    }

    setIsAdding(false);
    setEditingId(null);
  };

  const handleToggleActive = (id: string) => {
    onUpdateConditions(
      conditions.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('คุณต้องการลบเงื่อนไขการคิดเงินนี้หรือไม่?')) {
      onUpdateConditions(conditions.filter((c) => c.id !== id));
    }
  };

  const filteredConditions = conditions.filter((c) => {
    if (filterBranch !== 'ทั้งหมด' && c.branch !== filterBranch && c.branch !== 'ทั้งหมด') {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        c.code.toLowerCase().includes(q) ||
        c.conditionName.toLowerCase().includes(q) ||
        c.value.toLowerCase().includes(q) ||
        c.applicableTo.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q);
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
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <span>เงื่อนไขการคิดเงิน (Billing Conditions Manager - Prompt 2.3)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                {conditions.length} เงื่อนไข (C01 - C08)
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              กำหนดเงื่อนไขพิเศษ เช่น เที่ยวกลับ Backhaul (50%), จุดส่งเพิ่ม Multi-drop, อัตราขั้นต่ำต่อเที่ยว, สัญญา Roland บางบ่อ และลูกค้าตรึงราคาน้ำมัน Fixed Diesel
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            เพิ่มเงื่อนไข (Add Condition)
          </button>
        </div>

        {/* Search & Branch filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเงื่อนไข เช่น Backhaul, Roland, Multi-drop, ขั้นต่ำ..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-purple-500"
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
                      ? 'bg-purple-600 text-white'
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
          className="bg-purple-50/50 dark:bg-purple-950/20 p-5 rounded-xl border border-purple-200 dark:border-purple-900 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-600" />
              {editingId ? 'แก้ไขเงื่อนไขการคิดเงิน' : 'เพิ่มเงื่อนไขการคิดเงินใหม่'}
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
                รหัสเงื่อนไข (Code): *
              </label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="เช่น C01, C09"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                ชื่อเงื่อนไข (Condition Name): *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="เช่น Backhaul Rate (เที่ยวขากลับ), Roland Special"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs font-bold"
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

            <div className="sm:col-span-3">
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                ค่าที่กำหนด / กฎการคำนวณ (Rule Value): *
              </label>
              <input
                type="text"
                required
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="เช่น 50% ของเรทเที่ยวไป หรือ จุดแรกฟรี คิด 500 บาทตั้งแต่จุดที่ 2"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 mb-1 font-semibold">
                มีผลกับบริษัท: *
              </label>
              <input
                type="text"
                value={formApplicableTo}
                onChange={(e) => setFormApplicableTo(e.target.value)}
                placeholder="เช่น ทั้งหมด, ROLAND, SIEMENS"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[11px] text-slate-500 mb-1">
                หมายเหตุประกอบการใช้งาน:
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="เช่น รายละเอียดสัญญากับลูกค้า หรือเกณฑ์เฉพาะของสาขา"
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
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              บันทึกเงื่อนไข
            </button>
          </div>
        </form>
      )}

      {/* Conditions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
              <tr>
                <th className="py-3 px-3 font-mono">รหัส</th>
                <th className="py-3 px-4">ชื่อเงื่อนไขการคิดเงิน</th>
                <th className="py-3 px-4">ค่าที่กำหนด / กฎ (Rule)</th>
                <th className="py-3 px-3">บริษัทที่มีผล</th>
                <th className="py-3 px-3 text-center">สาขา</th>
                <th className="py-3 px-4">หมายเหตุ</th>
                <th className="py-3 px-3 text-center">สถานะ</th>
                <th className="py-3 px-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredConditions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    ไม่พบเงื่อนไขที่ตรงกับตัวกรอง
                  </td>
                </tr>
              ) : (
                filteredConditions.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="py-3 px-3 font-mono font-bold text-purple-600 dark:text-purple-400">
                      {rule.code}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {rule.conditionName}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200">
                      {rule.value}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                      {rule.applicableTo}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-semibold">
                        {rule.branch}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate text-[11px]">
                      {rule.notes}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleActive(rule.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition ${
                          rule.active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {rule.active ? 'ใช้งาน' : 'ปิด'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(rule)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
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
