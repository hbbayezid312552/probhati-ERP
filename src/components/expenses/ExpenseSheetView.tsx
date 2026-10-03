import React, { useState } from 'react';
import { db, getTodayDateString } from '../../db/storage';
import { AppLanguage, ExpenseSheetEntry, SalesRepresentative, Dealer } from '../../types';
import {
  formatCurrency,
  formatNumber,
  toBengaliNumber,
} from '../../utils/formatters';
import {
  Truck,
  Plus,
  Trash2,
  Edit,
  Download,
  Printer,
  Calendar,
  Coffee,
  Percent,
  Wallet,
  CheckCircle2,
  X,
  Search,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';

interface Props {
  lang: AppLanguage;
}

export const ExpenseSheetView: React.FC<Props> = ({ lang }) => {
  const srs = db.getSRs();
  const dealers = db.getDealers();
  const invoices = db.getInvoices();

  const [expenses, setExpenses] = useState<ExpenseSheetEntry[]>(() => db.getExpenseEntries());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSRId, setSelectedSRId] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExpenseSheetEntry | null>(null);

  // Form Fields
  const [date, setDate] = useState(getTodayDateString());
  const [srId, setSrId] = useState(srs.length > 0 ? srs[0].id : '');
  const [dealerName, setDealerName] = useState('');
  const [route, setRoute] = useState(srs.length > 0 ? srs[0].areaRoute : '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleRent, setVehicleRent] = useState<number>(0);
  const [snacksCost, setSnacksCost] = useState<number>(0);
  const [commissionAdjustment, setCommissionAdjustment] = useState<number>(0); // positive or negative
  const [labourCost, setLabourCost] = useState<number>(0);
  const [otherExpenses, setOtherExpenses] = useState<number>(0);
  const [salesCollection, setSalesCollection] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const refreshExpenses = () => {
    setExpenses(db.getExpenseEntries());
  };

  const handleOpenAdd = () => {
    setEditingEntry(null);
    setDate(getTodayDateString());
    const defaultSR = srs.length > 0 ? srs[0] : null;
    setSrId(defaultSR ? defaultSR.id : '');
    setRoute(defaultSR ? defaultSR.areaRoute : '');
    setDealerName('');
    setInvoiceNumber('');
    setVehicleNumber('বগুড়া-থ-১১২৪ (ভ্যান)');
    setVehicleRent(400);
    setSnacksCost(100);
    setCommissionAdjustment(0);
    setLabourCost(150);
    setOtherExpenses(0);
    setSalesCollection(5000);
    setNotes('');
    setShowModal(true);
  };

  const handleOpenEdit = (entry: ExpenseSheetEntry) => {
    setEditingEntry(entry);
    setDate(entry.date);
    setSrId(entry.srId || '');
    setDealerName(entry.dealerName || '');
    setRoute(entry.route || '');
    setInvoiceNumber(entry.invoiceNumber || '');
    setVehicleNumber(entry.vehicleNumber || '');
    setVehicleRent(entry.vehicleRent || 0);
    setSnacksCost(entry.snacksCost || 0);
    setCommissionAdjustment(entry.commissionAdjustment || 0);
    setLabourCost(entry.labourCost || 0);
    setOtherExpenses(entry.otherExpenses || 0);
    setSalesCollection(entry.salesCollection || 0);
    setNotes(entry.notes || '');
    setShowModal(true);
  };

  const handleSRChange = (id: string) => {
    setSrId(id);
    const sr = srs.find((s) => s.id === id);
    if (sr) {
      setRoute(sr.areaRoute);
    }
  };

  // Form Calculations
  const calcTotalExpense =
    (vehicleRent || 0) +
    (snacksCost || 0) +
    (labourCost || 0) +
    (otherExpenses || 0) +
    (commissionAdjustment || 0);

  const calcNetCash = (salesCollection || 0) - calcTotalExpense;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const sr = srs.find((s) => s.id === srId);

    const totalExpense = calcTotalExpense;
    const netCashDeposit = calcNetCash;

    if (editingEntry) {
      const updated: ExpenseSheetEntry = {
        ...editingEntry,
        date,
        srId,
        srName: sr ? sr.name : editingEntry.srName,
        dealerName,
        route,
        invoiceNumber,
        vehicleNumber,
        vehicleRent,
        snacksCost,
        commissionAdjustment,
        labourCost,
        otherExpenses,
        totalExpense,
        salesCollection,
        netCashDeposit,
        notes,
      };
      db.saveExpenseEntry(updated);
    } else {
      const newEntry: ExpenseSheetEntry = {
        id: `exp-${Date.now()}`,
        date,
        srId,
        srName: sr ? sr.name : 'সাধারণ এস.আর',
        dealerName,
        route,
        invoiceNumber,
        vehicleNumber,
        vehicleRent,
        snacksCost,
        commissionAdjustment,
        labourCost,
        otherExpenses,
        totalExpense,
        salesCollection,
        netCashDeposit,
        notes,
        createdAt: new Date().toISOString(),
      };
      db.saveExpenseEntry(newEntry);
    }

    setShowModal(false);
    refreshExpenses();
  };

  const handleDelete = (id: string) => {
    if (confirm(lang === 'bn' ? 'এই খরচের এন্ট্রি কি মুছে ফেলতে চান?' : 'Delete this expense entry?')) {
      db.deleteExpenseEntry(id);
      refreshExpenses();
    }
  };

  // Filter expenses
  const filteredExpenses = expenses.filter((e) => {
    if (selectedSRId !== 'all' && e.srId !== selectedSRId) return false;
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchVehicle = e.vehicleNumber?.toLowerCase().includes(q);
      const matchSR = e.srName?.toLowerCase().includes(q);
      const matchDealer = e.dealerName?.toLowerCase().includes(q);
      const matchRoute = e.route?.toLowerCase().includes(q);
      const matchInv = e.invoiceNumber?.toLowerCase().includes(q);
      const matchNotes = e.notes?.toLowerCase().includes(q);
      return matchVehicle || matchSR || matchDealer || matchRoute || matchInv || matchNotes;
    }
    return true;
  });

  // KPI aggregates
  const sumVehicleRent = filteredExpenses.reduce((s, e) => s + (e.vehicleRent || 0), 0);
  const sumSnacks = filteredExpenses.reduce((s, e) => s + (e.snacksCost || 0), 0);
  const sumCommissionAdj = filteredExpenses.reduce((s, e) => s + (e.commissionAdjustment || 0), 0);
  const sumLabour = filteredExpenses.reduce((s, e) => s + (e.labourCost || 0), 0);
  const sumTotalExpenses = filteredExpenses.reduce((s, e) => s + (e.totalExpense || 0), 0);
  const sumSalesCollection = filteredExpenses.reduce((s, e) => s + (e.salesCollection || 0), 0);
  const sumNetCashDeposit = filteredExpenses.reduce((s, e) => s + (e.netCashDeposit || 0), 0);

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Date,SR,Route,Vehicle,InvoiceNo,VehicleRent,Snacks,CommissionAdj,Labour,Other,TotalExpense,SalesCollection,NetCashDeposit,Notes\n' +
      filteredExpenses
        .map(
          (e) =>
            `"${e.date}","${e.srName || ''}","${e.route || ''}","${e.vehicleNumber || ''}","${e.invoiceNumber || ''}",${e.vehicleRent},${e.snacksCost},${e.commissionAdjustment},${e.labourCost},${e.otherExpenses},${e.totalExpense},${e.salesCollection},${e.netCashDeposit},"${e.notes || ''}"`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Probhati_Expense_Sheet_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-700 text-amber-100 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {lang === 'bn'
                ? 'ডেলিভারি ও ফিল্ড খরচ শিট (গাড়ি ভাড়া, নাস্তা, কমিশন কম/বেশি)'
                : 'Delivery & Field Expense Sheet'}
            </h1>
            <p className="text-xs text-slate-500">
              {lang === 'bn'
                ? 'এস.আর এবং চালানের গাড়ি ভাড়া, নাস্তা, কমিশন কম/বেশি খরচ এন্ট্রি এবং ক্যাশ জমা রিকনসিলিয়েশন'
                : 'Vehicle fare, snacks, commission adjustments and cash deposit calculations'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'bn' ? '+ নতুন খরচ এন্ট্রি' : '+ Log Expense'}</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Vehicle Rent */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-[11px] font-medium flex items-center justify-between">
            <span>{lang === 'bn' ? 'গাড়ি ভাড়া' : 'Vehicle Fare'}</span>
            <Truck className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 font-mono-num mt-1">
            {formatCurrency(sumVehicleRent, lang)}
          </div>
        </div>

        {/* Snacks */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-[11px] font-medium flex items-center justify-between">
            <span>{lang === 'bn' ? 'নাস্তা ও আপ্যায়ন' : 'Snacks'}</span>
            <Coffee className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 font-mono-num mt-1">
            {formatCurrency(sumSnacks, lang)}
          </div>
        </div>

        {/* Commission Adj */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-[11px] font-medium flex items-center justify-between">
            <span>{lang === 'bn' ? 'কমিশন কম/বেশি' : 'Comm. Adj'}</span>
            <Percent className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div
            className={`text-base sm:text-lg font-bold font-mono-num mt-1 ${
              sumCommissionAdj >= 0 ? 'text-purple-700' : 'text-red-600'
            }`}
          >
            {sumCommissionAdj > 0 ? '+' : ''}
            {formatCurrency(sumCommissionAdj, lang)}
          </div>
        </div>

        {/* Labour */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-[11px] font-medium flex items-center justify-between">
            <span>{lang === 'bn' ? 'লেবার / লোডিং' : 'Labour'}</span>
            <span className="text-[10px] font-bold text-slate-400">LAB</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 font-mono-num mt-1">
            {formatCurrency(sumLabour, lang)}
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-3.5 bg-red-50/70 rounded-xl border border-red-200 shadow-xs">
          <div className="text-red-800 text-[11px] font-bold flex items-center justify-between">
            <span>{lang === 'bn' ? 'সর্বমোট ডেলিভারি খরচ' : 'Total Expenses'}</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="text-base sm:text-lg font-bold text-red-900 font-mono-num mt-1">
            {formatCurrency(sumTotalExpenses, lang)}
          </div>
        </div>

        {/* Net Cash Deposit */}
        <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 shadow-xs">
          <div className="text-emerald-800 text-[11px] font-bold flex items-center justify-between">
            <span>{lang === 'bn' ? 'নিট ক্যাশ জমা' : 'Net Cash Deposit'}</span>
            <Wallet className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-950 font-mono-num mt-1">
            {formatCurrency(sumNetCashDeposit, lang)}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'bn' ? 'গাড়ি নম্বর, এস.আর, ডিলার, রুট বা নোট দিয়ে খুঁজুন...' : 'Search vehicle, SR, route, notes...'}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">এস.আর:</span>
          <select
            value={selectedSRId}
            onChange={(e) => setSelectedSRId(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
          >
            <option value="all">{lang === 'bn' ? 'সকল এস.আর (All)' : 'All SRs'}</option>
            {srs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.srCode})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">হতে</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
          />
          <span className="text-slate-400">পর্যন্ত</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
          />
        </div>
      </div>

      {/* Expense Ledger Table */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">তারিখ</th>
                <th className="py-2.5 px-3">এস.আর ও রুট</th>
                <th className="py-2.5 px-3">গাড়ি / পরিবহন</th>
                <th className="py-2.5 px-2 text-right">গাড়ি ভাড়া</th>
                <th className="py-2.5 px-2 text-right">নাস্তা</th>
                <th className="py-2.5 px-2 text-right">কমিশন কম/বেশি</th>
                <th className="py-2.5 px-2 text-right">লেবার</th>
                <th className="py-2.5 px-3 text-right font-bold text-red-700 bg-red-50/40">মোট খরচ</th>
                <th className="py-2.5 px-3 text-right">কালেকশন</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-900 bg-emerald-50/40">ক্যাশ জমা</th>
                <th className="py-2.5 px-3">মন্তব্য / বিবরণ</th>
                <th className="py-2.5 px-2 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-3 text-slate-600 font-mono">
                    {toBengaliNumber(exp.date)}
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-900">{exp.srName || 'ফিল্ড'}</p>
                    {exp.route && <p className="text-[10px] text-slate-500">{exp.route}</p>}
                    {exp.invoiceNumber && (
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded-sm">
                        {exp.invoiceNumber}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">
                    {exp.vehicleNumber || 'সাধারণ ডেলিভারি'}
                    {exp.dealerName && (
                      <p className="text-[10px] text-slate-500">ডিলার: {exp.dealerName}</p>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right font-mono-num text-slate-700">
                    {formatCurrency(exp.vehicleRent, lang)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono-num text-slate-700">
                    {formatCurrency(exp.snacksCost, lang)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono-num font-medium">
                    <span
                      className={
                        exp.commissionAdjustment > 0
                          ? 'text-purple-700'
                          : exp.commissionAdjustment < 0
                          ? 'text-red-600'
                          : 'text-slate-500'
                      }
                    >
                      {exp.commissionAdjustment > 0 ? '+' : ''}
                      {formatCurrency(exp.commissionAdjustment, lang)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right font-mono-num text-slate-700">
                    {formatCurrency(exp.labourCost, lang)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono-num font-bold text-red-700 bg-red-50/40">
                    {formatCurrency(exp.totalExpense, lang)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono-num font-medium text-slate-800">
                    {formatCurrency(exp.salesCollection, lang)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono-num font-bold text-emerald-900 bg-emerald-50/40">
                    {formatCurrency(exp.netCashDeposit, lang)}
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-[11px] italic max-w-xs truncate">
                    {exp.notes || '-'}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(exp)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded-md"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-md"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    {lang === 'bn' ? 'কোনো খরচের রেকর্ড পাওয়া যায়নি' : 'No expense entries found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-xs my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingEntry
                  ? lang === 'bn' ? 'খরচ বিবরণ সংশোধন' : 'Edit Expense Entry'
                  : lang === 'bn' ? 'নতুন ডেলিভারি ও ফিল্ড খরচ এন্ট্রি' : 'Log Delivery & Field Expense'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? 'তারিখ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? 'এস.আর নির্বাচন' : 'S.R Name'}
                  </label>
                  <select
                    value={srId}
                    onChange={(e) => handleSRChange(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md"
                  >
                    {srs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.srCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? 'রুট / এলাকা' : 'Route / Area'}
                  </label>
                  <input
                    type="text"
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    placeholder="e.g. Kichok - Shibganj"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? 'গাড়ি নম্বর / পরিবহন মাধ্যম' : 'Vehicle No / Transport'}
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="বগুড়া-থ-১১২৪ (ভ্যান/পিকআপ)..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? 'ডিলার / দোকানের নাম (ঐচ্ছিক)' : 'Dealer / Store Name'}
                  </label>
                  <input
                    type="text"
                    value={dealerName}
                    onChange={(e) => setDealerName(e.target.value)}
                    placeholder="সততা স্টোর..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? 'চালান নম্বর (ঐচ্ছিক)' : 'Invoice #'}
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="PFP-SR-2026-0002"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              {/* Expense Breakdown Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-xs border-b border-slate-200 pb-1">
                  {lang === 'bn' ? 'খরচের বিস্তারিত বিবরণ (টাকায়)' : 'Expense Breakdown (BDT)'}
                </span>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {lang === 'bn' ? 'গাড়ি ভাড়া (Fare)' : 'Vehicle Rent'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={vehicleRent}
                      onChange={(e) => setVehicleRent(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {lang === 'bn' ? 'নাস্তা খরচ (Snacks)' : 'Snacks Cost'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={snacksCost}
                      onChange={(e) => setSnacksCost(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1" title="বেশি ছাড় হলে ধনাত্মক (+), কম ছাড় হলে ঋণাত্মক (-)">
                      {lang === 'bn' ? 'কমিশন কম/বেশি' : 'Comm. Adj (±)'}
                    </label>
                    <input
                      type="number"
                      value={commissionAdjustment}
                      onChange={(e) => setCommissionAdjustment(parseFloat(e.target.value) || 0)}
                      placeholder="+৫০ বা -৫০"
                      className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono font-bold text-purple-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {lang === 'bn' ? 'লেবার / লোডিং' : 'Labour / Loading'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={labourCost}
                      onChange={(e) => setLabourCost(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {lang === 'bn' ? 'অন্যান্য বিবিধ খরচ' : 'Other Expenses'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={otherExpenses}
                      onChange={(e) => setOtherExpenses(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-red-700 mb-1">
                      {lang === 'bn' ? 'সর্বমোট খরচ (অটো)' : 'Total Expense'}
                    </label>
                    <div className="p-2 bg-red-100/60 border border-red-200 rounded-md font-mono font-bold text-red-800 text-sm">
                      {formatCurrency(calcTotalExpense, lang)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash Collection & Deposit */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    {lang === 'bn' ? 'ফিল্ড সেলস কালেকশন' : 'Sales Collection'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={salesCollection}
                    onChange={(e) => setSalesCollection(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-md font-mono font-bold text-emerald-950"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-emerald-900 mb-1">
                    {lang === 'bn' ? 'অফিসে ক্যাশ জমা (Net Cash)' : 'Net Cash Deposit'}
                  </label>
                  <div className="p-2 bg-white border border-emerald-400 rounded-md font-mono font-bold text-emerald-900 text-base">
                    {formatCurrency(calcNetCash, lang)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'bn' ? 'খরচের নোট / বিবরণ' : 'Expense Notes'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: কিচক বাজারে ভ্যান ভাড়া ও লোডিং বিল...' : 'Notes...'}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-xs"
                >
                  {lang === 'bn' ? 'খরচ সংরক্ষণ করুন' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
