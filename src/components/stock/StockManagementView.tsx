import React, { useState } from 'react';
import { db } from '../../db/storage';
import { AppLanguage, Product } from '../../types';
import {
  formatCartonPieceDisplay,
  formatCurrency,
  formatNumber,
  toBengaliNumber,
} from '../../utils/formatters';
import {
  Package,
  Plus,
  AlertTriangle,
  Sliders,
  Edit,
  Trash2,
  CheckCircle2,
  X,
  Search,
} from 'lucide-react';

interface Props {
  lang: AppLanguage;
  onNavigateToPurchase?: () => void;
}

export const StockManagementView: React.FC<Props> = ({ lang, onNavigateToPurchase }) => {
  const [products, setProducts] = useState<Product[]>(() => db.getProducts());
  const [categories, setCategories] = useState<string[]>(() => db.getCategories());
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showInlineNewCat, setShowInlineNewCat] = useState(false);
  const [inlineNewCat, setInlineNewCat] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  // New/Edit product form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [category, setCategory] = useState('Oil');
  const [bulkUnit, setBulkUnit] = useState<string>('কার্টুন');
  const [baseUnit, setBaseUnit] = useState<string>('পিস');
  const [piecesPerCarton, setPiecesPerCarton] = useState(12);
  const [tradePrice, setTradePrice] = useState(200);
  const [defaultMarginPercent, setDefaultMarginPercent] = useState(0); // 0% default
  const [dealerPrice, setDealerPrice] = useState(200);
  const [srMarginPercent, setSrMarginPercent] = useState(0); // 0% default
  const [srPrice, setSrPrice] = useState(200);
  const [mrp, setMrp] = useState(220);
  const [minStockLevel, setMinStockLevel] = useState(50);
  const [openingStock, setOpeningStock] = useState(100);

  // Adjustment form state
  const [adjType, setAdjType] = useState<'add' | 'subtract'>('add');
  const [adjCartons, setAdjCartons] = useState(0);
  const [adjPieces, setAdjPieces] = useState(0);
  const [adjReason, setAdjReason] = useState('');

  const refreshProducts = () => {
    setProducts(db.getProducts());
    setCategories(db.getCategories());
  };

  const handleAddNewCategory = (catName: string) => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    const updated = db.addCategory(trimmed);
    setCategories(updated);
    setCategory(trimmed);
    setNewCategoryName('');
    setInlineNewCat('');
    setShowAddCategoryModal(false);
    setShowInlineNewCat(false);
  };

  const purchases = db.getPurchases();
  const invoices = db.getInvoices();
  const damages = db.getDamageRecords();
  const returns = db.getReturnRecords();
  const adjustments = db.getStockAdjustments();

  // Helper to compute breakdown for each product
  const getProductBreakdown = (prodId: string) => {
    // Total Purchases
    const purchasedPieces = purchases.reduce((sum, pur) => {
      const it = pur.items.find((i) => i.productId === prodId);
      return sum + (it ? it.totalPieces : 0);
    }, 0);

    // Total Sales
    const soldPieces = invoices.reduce((sum, inv) => {
      const it = inv.items.find((i) => i.productId === prodId);
      return sum + (it ? it.totalPieces : 0);
    }, 0);

    // Total Damage
    const damagedPieces = damages
      .filter((d) => d.productId === prodId)
      .reduce((sum, d) => sum + d.totalPieces, 0);

    // Total Return
    const returnedPieces = returns
      .filter((r) => r.productId === prodId)
      .reduce((sum, r) => sum + r.totalPieces, 0);

    // Total Adjustments
    const netAdjustmentPieces = adjustments
      .filter((a) => a.productId === prodId)
      .reduce((sum, a) => sum + (a.type === 'add' ? a.totalPieces : -a.totalPieces), 0);

    return {
      purchasedPieces,
      soldPieces,
      damagedPieces,
      returnedPieces,
      netAdjustmentPieces,
    };
  };

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setCode(`P-${products.length + 101}`);
    setName('');
    setNameBn('');
    setCategory(categories[0] || 'General');
    setBulkUnit('কার্টুন');
    setBaseUnit('পিস');
    setPiecesPerCarton(12);
    setTradePrice(200);
    setDefaultMarginPercent(0); // 0% commission default as requested!
    setDealerPrice(200);
    setSrMarginPercent(0); // 0% commission default as requested!
    setSrPrice(200);
    setMrp(220);
    setMinStockLevel(48);
    setOpeningStock(120);
    setShowInlineNewCat(false);
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setNameBn(p.nameBn);
    setCategory(p.category);
    setBulkUnit(p.bulkUnit || 'কার্টুন');
    setBaseUnit(p.baseUnit || 'পিস');
    setPiecesPerCarton(p.piecesPerCarton || 12);
    setTradePrice(p.tradePrice);
    setDefaultMarginPercent(p.defaultMarginPercent);
    setDealerPrice(p.dealerPrice);
    setSrMarginPercent(p.srMarginPercent || 7);
    setSrPrice(p.srPrice || (p.tradePrice - (p.tradePrice * (p.srMarginPercent || 7)) / 100));
    setMrp(p.mrp);
    setMinStockLevel(p.minStockLevel);
    setOpeningStock(p.openingStock);
    setShowProductModal(true);
  };

  const handleTradePriceChange = (tp: number) => {
    setTradePrice(tp);
    const dp = tp - (tp * defaultMarginPercent) / 100;
    setDealerPrice(Number(dp.toFixed(2)));
    const sp = tp - (tp * srMarginPercent) / 100;
    setSrPrice(Number(sp.toFixed(2)));
  };

  const handleDealerMarginChange = (margin: number) => {
    setDefaultMarginPercent(margin);
    const dp = tradePrice - (tradePrice * margin) / 100;
    setDealerPrice(Number(dp.toFixed(2)));
  };

  const handleDealerPriceChange = (dp: number) => {
    setDealerPrice(dp);
    if (tradePrice > 0) {
      const margin = ((tradePrice - dp) / tradePrice) * 100;
      setDefaultMarginPercent(Number(margin.toFixed(2)));
    }
  };

  const handleSRMarginChange = (margin: number) => {
    setSrMarginPercent(margin);
    const sp = tradePrice - (tradePrice * margin) / 100;
    setSrPrice(Number(sp.toFixed(2)));
  };

  const handleSRPriceChange = (sp: number) => {
    setSrPrice(sp);
    if (tradePrice > 0) {
      const margin = ((tradePrice - sp) / tradePrice) * 100;
      setSrMarginPercent(Number(margin.toFixed(2)));
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && !nameBn.trim()) return;

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        code,
        name: name || nameBn,
        nameBn: nameBn || name,
        category,
        bulkUnit,
        baseUnit,
        piecesPerCarton,
        tradePrice,
        defaultMarginPercent,
        dealerPrice,
        srMarginPercent,
        srPrice,
        mrp,
        minStockLevel,
      };
      db.saveProduct(updated);
    } else {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        code,
        name: name || nameBn,
        nameBn: nameBn || name,
        category,
        bulkUnit,
        baseUnit,
        piecesPerCarton,
        tradePrice,
        defaultMarginPercent,
        dealerPrice,
        srMarginPercent,
        srPrice,
        mrp,
        minStockLevel,
        openingStock,
        currentStock: openingStock,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      db.saveProduct(newProd);
    }

    setShowProductModal(false);
    refreshProducts();
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত এই পণ্যটি ডিলিট করতে চান?' : 'Delete this product?')) {
      db.deleteProduct(productId);
      refreshProducts();
    }
  };

  const handleOpenAdjustment = (prod: Product) => {
    setAdjustingProduct(prod);
    setAdjType('add');
    setAdjCartons(0);
    setAdjPieces(0);
    setAdjReason(lang === 'bn' ? 'ফিজিক্যাল স্টক অডিট সমন্বয়' : 'Stock audit adjustment');
    setShowAdjustmentModal(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    const totalDiffPieces = adjCartons * adjustingProduct.piecesPerCarton + adjPieces;
    if (totalDiffPieces <= 0) return;

    const signedDiff = adjType === 'add' ? totalDiffPieces : -totalDiffPieces;
    db.adjustProductStockDirect(adjustingProduct.id, signedDiff, adjReason);

    setShowAdjustmentModal(false);
    refreshProducts();
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;
    if (!matchesCategory) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.code.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.nameBn.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-800 text-teal-200 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {lang === 'bn' ? 'স্টক ও ইনভেন্টরি ম্যানেজমেন্ট' : 'Stock & Inventory Management'}
              </h1>
              <p className="text-xs text-slate-500">
                {lang === 'bn'
                  ? 'ওপেনিং, ক্রয় (+), বিক্রয় (-), ড্যামেজ (-), রিটার্ন (+) এবং সমন্বয়সহ সঠিক বর্তমান মজুদ'
                  : 'Opening + Purchase - Sales - Damage + Return = Live Stock tracking'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddCategoryModal(true)}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 transition"
              title="নতুন ক্যাটাগরি যোগ করুন"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '+ নতুন ক্যাটাগরি' : '+ Add Category'}</span>
            </button>

            {onNavigateToPurchase && (
              <button
                onClick={onNavigateToPurchase}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                {lang === 'bn' ? '+ নতুন ক্রয় এন্ট্রি' : '+ Purchase Entry'}
              </button>
            )}
            <button
              onClick={handleOpenNewProduct}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'bn' ? '+ নতুন পণ্য যোগ' : '+ Add Product'}</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 pt-3 border-t border-slate-100 relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'bn' ? 'পণ্যের নাম বা কোড খুঁজুন...' : 'Search by product name or code...'}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        {/* Category Pills & Quick Filter */}
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap mr-1">
            {lang === 'bn' ? 'ক্যাটাগরি ফিল্টার:' : 'Filter:'}
          </span>
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedCategoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {lang === 'bn' ? 'সকল পণ্য' : 'All Products'} ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  selectedCategoryFilter === cat
                    ? 'bg-emerald-800 text-white font-bold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Stock Master Table (Requirement 11) */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-2 text-center w-10">ক্র.</th>
                <th className="py-2.5 px-3 min-w-[200px]">পণ্য ও কোড (Product & Rates)</th>
                <th className="py-2.5 px-2 text-center w-28">প্যাকেজিং / একক</th>
                <th className="py-2.5 px-2 text-right w-20">Opening</th>
                <th className="py-2.5 px-2 text-right w-20 text-emerald-700">Purchase (+)</th>
                <th className="py-2.5 px-2 text-right w-20 text-blue-700">Sales (-)</th>
                <th className="py-2.5 px-2 text-right w-20 text-red-600">Damage (-)</th>
                <th className="py-2.5 px-2 text-right w-20 text-amber-700">Return (+)</th>
                <th className="py-2.5 px-2 text-right w-20">Adj (±)</th>
                <th className="py-2.5 px-3 text-right min-w-[140px] bg-slate-50 font-bold">Current Stock</th>
                <th className="py-2.5 px-2 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p, idx) => {
                const isLow = p.currentStock <= p.minStockLevel;
                const stats = getProductBreakdown(p.id);
                const bUnit = p.bulkUnit || 'কার্টুন';
                const sUnit = p.baseUnit || 'পিস';

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/80 transition ${
                      isLow ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="py-3 px-2 text-center font-mono text-slate-500">
                      {lang === 'bn' ? toBengaliNumber(idx + 1) : idx + 1}
                    </td>

                    {/* Product Name & Rates */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{p.nameBn || p.name}</span>
                        {isLow && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-red-100 text-red-700 border border-red-200"
                            title="Low Stock Alert"
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {lang === 'bn' ? 'স্বল্প স্টক' : 'Low Stock'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono mt-1">
                        <span className="text-slate-500 font-semibold">{p.code}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-600">T.P: ৳{p.tradePrice}</span>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                          ডিলার: ৳{p.dealerPrice}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-sm bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                          এস.আর: ৳{p.srPrice || p.dealerPrice}
                        </span>
                      </div>
                    </td>

                    {/* Packaging Units */}
                    <td className="py-3 px-2 text-center">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700">
                        ১ {bUnit} = {formatNumber(p.piecesPerCarton, lang)} {sUnit}
                      </span>
                    </td>

                    {/* Opening Stock */}
                    <td className="py-3 px-2 text-right font-mono-num text-slate-600">
                      {formatNumber(p.openingStock, lang)}
                    </td>

                    {/* Purchase (+) */}
                    <td className="py-3 px-2 text-right font-mono-num font-medium text-emerald-700">
                      +{formatNumber(stats.purchasedPieces, lang)}
                    </td>

                    {/* Sales (-) */}
                    <td className="py-3 px-2 text-right font-mono-num font-medium text-blue-700">
                      -{formatNumber(stats.soldPieces, lang)}
                    </td>

                    {/* Damage (-) */}
                    <td className="py-3 px-2 text-right font-mono-num text-red-600">
                      {stats.damagedPieces > 0 ? `-${formatNumber(stats.damagedPieces, lang)}` : '০'}
                    </td>

                    {/* Return (+) */}
                    <td className="py-3 px-2 text-right font-mono-num text-amber-700">
                      {stats.returnedPieces > 0 ? `+${formatNumber(stats.returnedPieces, lang)}` : '০'}
                    </td>

                    {/* Adjustment */}
                    <td className="py-3 px-2 text-right font-mono-num text-slate-500">
                      {stats.netAdjustmentPieces !== 0
                        ? `${stats.netAdjustmentPieces > 0 ? '+' : ''}${formatNumber(stats.netAdjustmentPieces, lang)}`
                        : '০'}
                    </td>

                    {/* Current Stock */}
                    <td className="py-3 px-3 text-right bg-slate-50">
                      <div
                        className={`font-mono-num font-bold text-sm ${
                          isLow ? 'text-red-700' : 'text-emerald-900'
                        }`}
                      >
                        {formatNumber(p.currentStock, lang)} {sUnit}
                      </div>
                      <div className="text-[10px] text-slate-600 font-medium">
                        {formatCartonPieceDisplay(p.currentStock, p.piecesPerCarton, lang, bUnit, sUnit)}
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Adjust Stock */}
                        <button
                          onClick={() => handleOpenAdjustment(p)}
                          className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-md transition"
                          title={lang === 'bn' ? 'স্টক সমন্বয়' : 'Stock Adjustment'}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition"
                          title={lang === 'bn' ? 'এডিট' : 'Edit'}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-md transition"
                          title={lang === 'bn' ? 'মুছুন' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    {lang === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No products found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct
                  ? lang === 'bn'
                    ? 'পণ্য সম্পাদনা (Edit Product)'
                    : 'Edit Product'
                  : lang === 'bn'
                  ? 'নতুন পণ্য যোগ করুন (Add Product)'
                  : 'Add New Product'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? 'পণ্য কোড (Product Code)' : 'Product Code'}
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      {lang === 'bn' ? 'ক্যাটাগরি (Category)' : 'Category'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowInlineNewCat(!showInlineNewCat)}
                      className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{lang === 'bn' ? '+ নতুন' : '+ New'}</span>
                    </button>
                  </div>

                  {showInlineNewCat ? (
                    <div className="flex items-center gap-1.5 p-1 bg-emerald-50 border border-emerald-300 rounded-md">
                      <input
                        type="text"
                        value={inlineNewCat}
                        onChange={(e) => setInlineNewCat(e.target.value)}
                        placeholder={lang === 'bn' ? 'ক্যাটাগরির নাম...' : 'Category name...'}
                        className="w-full p-1 bg-white border border-emerald-300 rounded text-xs text-slate-800 font-medium"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNewCategory(inlineNewCat)}
                        className="px-2 py-1 text-xs font-semibold rounded bg-emerald-700 text-white hover:bg-emerald-800 shrink-0"
                      >
                        {lang === 'bn' ? 'যোগ' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowInlineNewCat(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={category}
                      onChange={(e) => {
                        if (e.target.value === '__add_new__') {
                          setShowInlineNewCat(true);
                        } else {
                          setCategory(e.target.value);
                        }
                      }}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-medium text-slate-800"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__add_new__" className="text-emerald-700 font-bold">
                        ➕ {lang === 'bn' ? '+ নতুন ক্যাটাগরি তৈরি করুন...' : '+ Create New Category...'}
                      </option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'bn' ? 'পণ্যের নাম (বাংলা)' : 'Product Name (Bengali)'}
                </label>
                <input
                  type="text"
                  required
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  placeholder="সরিষার তেল ১ লিটার..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'bn' ? 'পণ্যের নাম (ইংরেজি)' : 'Product Name (English)'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mustard Oil 1 Liter..."
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md"
                />
              </div>

              {/* Packaging Unit & Base Unit Section */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>{lang === 'bn' ? 'প্যাকেজিং ও পরিমাপ একক (Units)' : 'Packaging & Measurement Units'}</span>
                  <span className="text-[11px] font-normal text-slate-500">কার্টুন/বস্তা ও পিস/কেজি/লিটার</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Bulk Unit */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {lang === 'bn' ? 'বাল্ক প্যাকেজিং একক' : 'Bulk Packaging Unit'}
                    </label>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {['কার্টুন', 'বস্তা', 'কেস', 'ড্রাম', 'পেটি'].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setBulkUnit(u)}
                          className={`px-2 py-0.5 text-[11px] rounded-md border font-medium transition ${
                            bulkUnit === u
                              ? 'bg-emerald-800 text-white border-emerald-800'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={bulkUnit}
                      onChange={(e) => setBulkUnit(e.target.value)}
                      placeholder="e.g. কার্টুন, বস্তা..."
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-md font-medium"
                    />
                  </div>

                  {/* Base Unit */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {lang === 'bn' ? 'খুচরা / ভিত্তি একক' : 'Base Measurement Unit'}
                    </label>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {['পিস', 'কেজি', 'লিটার', 'গ্রাম', 'প্যাকেট'].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setBaseUnit(u)}
                          className={`px-2 py-0.5 text-[11px] rounded-md border font-medium transition ${
                            baseUnit === u
                              ? 'bg-blue-800 text-white border-blue-800'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={baseUnit}
                      onChange={(e) => setBaseUnit(e.target.value)}
                      placeholder="e.g. পিস, কেজি, লিটার..."
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-md font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      ১ {bulkUnit || 'কার্টুন'}-এ কত {baseUnit || 'পিস'}?
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={piecesPerCarton}
                      onChange={(e) => setPiecesPerCarton(parseInt(e.target.value, 10) || 1)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {lang === 'bn' ? 'ন্যূনতম অ্যালার্ট স্টক (Min Stock)' : 'Min Stock Alert'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={minStockLevel}
                      onChange={(e) => setMinStockLevel(parseInt(e.target.value, 10) || 0)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Price & Distinct Dealer vs SR Rates */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      T.P (ট্রেড মূল্য প্রতি {baseUnit || 'পিস'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      value={tradePrice}
                      onChange={(e) => handleTradePriceChange(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      M.R.P (খুচরা সর্বোচ্চ মূল্য)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      value={mrp}
                      onChange={(e) => setMrp(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Side-by-Side Dual Rate Configuration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Dealer Price Card */}
                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-300 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                      <span>ডিলার রেট (Dealer Price / D.P)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900">ডিলার চালান</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-900 mb-0.5">
                          কমিশন (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={defaultMarginPercent}
                          onChange={(e) => handleDealerMarginChange(parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 bg-white border border-emerald-300 rounded-md font-mono text-xs text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-900 mb-0.5">
                          D.P (প্রতি {baseUnit})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={dealerPrice}
                          onChange={(e) => handleDealerPriceChange(parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 bg-white border border-emerald-400 rounded-md font-mono text-xs font-bold text-emerald-900 text-right"
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-800 pt-1 border-t border-emerald-200 flex justify-between">
                      <span>১ {bulkUnit} D.P:</span>
                      <strong className="font-mono">৳ {(dealerPrice * piecesPerCarton).toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* S.R Price Card */}
                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-300 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                      <span>এস.আর রেট (S.R Price / Rate)</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-200 text-blue-900">এস.আর চালান</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-blue-900 mb-0.5">
                          কমিশন (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={srMarginPercent}
                          onChange={(e) => handleSRMarginChange(parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 bg-white border border-blue-300 rounded-md font-mono text-xs text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-blue-900 mb-0.5">
                          S.R (প্রতি {baseUnit})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={srPrice}
                          onChange={(e) => handleSRPriceChange(parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 bg-white border border-blue-400 rounded-md font-mono text-xs font-bold text-blue-900 text-right"
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-blue-800 pt-1 border-t border-blue-200 flex justify-between">
                      <span>১ {bulkUnit} S.R:</span>
                      <strong className="font-mono">৳ {(srPrice * piecesPerCarton).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {!editingProduct && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {lang === 'bn' ? 'প্রাথমিক ওপেনিং স্টক (Opening Pieces)' : 'Opening Stock (Pieces)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={openingStock}
                    onChange={(e) => setOpeningStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-xs"
                >
                  {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'bn' ? 'স্টক অ্যাডজাস্টমেন্ট / সমন্বয়' : 'Stock Adjustment'}
              </h3>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3 mt-4">
              <p className="font-semibold text-slate-800 text-sm">
                {adjustingProduct.nameBn || adjustingProduct.name}
              </p>
              <p className="text-slate-500">
                বর্তমান মজুদ: <strong>{adjustingProduct.currentStock} পিস</strong> (১ কার্টুন = {adjustingProduct.piecesPerCarton} পিস)
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'bn' ? 'সমন্বয়ের ধরন' : 'Adjustment Type'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('add')}
                    className={`py-2 rounded-lg font-bold border transition ${
                      adjType === 'add'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {lang === 'bn' ? '+ বৃদ্ধি করুন (Add)' : '+ Add Stock'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('subtract')}
                    className={`py-2 rounded-lg font-bold border transition ${
                      adjType === 'subtract'
                        ? 'bg-red-100 text-red-900 border-red-400'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {lang === 'bn' ? '- কমান (Subtract)' : '- Subtract Stock'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">কার্টুন</label>
                  <input
                    type="number"
                    min="0"
                    value={adjCartons}
                    onChange={(e) => setAdjCartons(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">পিস</label>
                  <input
                    type="number"
                    min="0"
                    value={adjPieces}
                    onChange={(e) => setAdjPieces(parseInt(e.target.value, 10) || 0)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'bn' ? 'সমন্বয়ের কারণ' : 'Reason for Adjustment'}
                </label>
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder={lang === 'bn' ? 'ফিজিক্যাল অডিটে উদ্বৃত্ত/ঘাটতি...' : 'Audit variance...'}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-md"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-xs"
                >
                  {lang === 'bn' ? 'সমন্বয় প্রয়োগ করুন' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs">
                  📁
                </span>
                {lang === 'bn' ? 'নতুন পণ্য ক্যাটাগরি যোগ করুন' : 'Add New Product Category'}
              </h3>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddNewCategory(newCategoryName);
              }}
              className="space-y-4 mt-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {lang === 'bn' ? 'ক্যাটাগরির নাম (বাংলা বা ইংরেজি)' : 'Category Name'}
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: পানীয় ও জুস, আটা-ময়দা, ইত্যাদি...' : 'e.g. Beverages & Juices...'}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-600"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                  {lang === 'bn' ? 'বর্তমান ক্যাটাগরি সমূহ:' : 'Existing Categories:'}
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {categories.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700 font-medium"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-xs"
                >
                  {lang === 'bn' ? 'ক্যাটাগরি সংরক্ষণ করুন' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
