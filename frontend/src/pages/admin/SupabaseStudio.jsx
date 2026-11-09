import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Database, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Download, 
  Check, 
  Copy, 
  AlertCircle, 
  CheckCircle2, 
  Table, 
  Eye
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

// Daftar tabel utama di Supabase E-CUKUR
export const KNOWN_TABLES = [
  { id: 'barbers', name: 'Barbers & Studio', desc: 'Profil barber, capster, paket langganan, dan alamat bio' },
  { id: 'bookings', name: 'Bookings & Reservasi', desc: 'Data reservasi sesi cukur, jam, status, dan pembayaran' },
  { id: 'services', name: 'Katalog Layanan', desc: 'Daftar layanan potong, cuci, styling, harga, & durasi' },
  { id: 'users', name: 'Akun Pengguna', desc: 'Data akun login, email, nomor HP, dan role (Customer / Barber)' },
  { id: 'qris_payments', name: 'Log Transaksi QRIS', desc: 'Data pembayaran Payhook/QRIS dinamis & status webhook' },
];

export default function SupabaseStudio({ onDataMutated }) {
  const [selectedTable, setSelectedTable] = useState('barbers');
  const [customTableName, setCustomTableName] = useState('');
  const [rows, setRows] = useState([]);
  const [tableCounts, setTableCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);

  const [activeRow, setActiveRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [formMode, setFormMode] = useState('fields'); // 'fields' | 'json'
  const [jsonInput, setJsonInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  // Muat ringkasan jumlah baris tiap tabel
  const fetchCounts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const counts = {};
    for (const t of KNOWN_TABLES) {
      try {
        const { count, error } = await supabase.from(t.id).select('*', { count: 'exact', head: true });
        if (!error && count !== null) {
          counts[t.id] = count;
        }
      } catch {}
    }
    setTableCounts(counts);
  }, []);

  // Ambil baris data tabel aktif
  const fetchTableData = useCallback(async (tableName = selectedTable) => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setErrorMessage('');
    try {
      let query = supabase.from(tableName).select('*').limit(200);
      
      const { data, error } = await query;
      if (error) throw error;

      setRows(data || []);
      // Perbarui count
      setTableCounts((prev) => ({ ...prev, [tableName]: (data || []).length }));
    } catch (err) {
      setErrorMessage(`Gagal membaca tabel "${tableName}": ${err.message}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTable]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchTableData(selectedTable);
  }, [selectedTable, fetchTableData]);

  // Kolom-kolom yang terdeteksi
  const columns = useMemo(() => {
    if (rows.length === 0) return ['id', 'created_at'];
    const colSet = new Set();
    rows.forEach((r) => {
      Object.keys(r || {}).forEach((k) => colSet.add(k));
    });
    const arr = Array.from(colSet);
    // Prioritaskan id dan name di awal
    return arr.sort((a, b) => {
      if (a === 'id') return -1;
      if (b === 'id') return 1;
      if (a === 'name' || a === 'customer_name') return -1;
      if (b === 'name' || b === 'customer_name') return 1;
      return 0;
    });
  }, [rows]);

  // Filter & Search baris
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter((row) => {
      return Object.entries(row || {}).some(([k, val]) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
          return JSON.stringify(val).toLowerCase().includes(q);
        }
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [rows, searchQuery]);

  // Buka Modal Tambah Data
  const handleOpenAdd = () => {
    setErrorMessage('');
    // Buat initial template berdasarkan tabel aktif
    let initialObj = {};
    if (columns.length > 0) {
      columns.forEach((col) => {
        if (col === 'id' || col === 'created_at' || col === 'updated_at') return;
        initialObj[col] = '';
      });
    } else {
      initialObj = { name: '' };
    }
    setFormData(initialObj);
    setJsonInput(JSON.stringify(initialObj, null, 2));
    setFormMode('fields');
    setIsAddModalOpen(true);
  };

  // Eksekusi Simpan Data Baru (CREATE)
  const handleSaveNew = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    let payload = {};

    if (formMode === 'json') {
      try {
        payload = JSON.parse(jsonInput);
      } catch (err) {
        setErrorMessage('Format JSON tidak valid: ' + err.message);
        return;
      }
    } else {
      payload = { ...formData };
      // Sanitasi nilai kosong & parsing angka / boolean / JSON jika perlu
      Object.keys(payload).forEach((k) => {
        const val = payload[k];
        if (val === '') {
          delete payload[k];
        } else if (val === 'true') {
          payload[k] = true;
        } else if (val === 'false') {
          payload[k] = false;
        } else if (!isNaN(Number(val)) && typeof val === 'string' && val.trim() !== '' && (k.includes('price') || k.includes('amount') || k.includes('duration') || k.includes('minutes') || k.includes('balance'))) {
          payload[k] = Number(val);
        }
      });
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.from(selectedTable).insert([payload]).select();
      if (error) throw error;

      showToast(`Sukses menambahkan baris baru ke tabel "${selectedTable}"!`);
      setIsAddModalOpen(false);
      fetchTableData(selectedTable);
      fetchCounts();
      if (typeof onDataMutated === 'function') onDataMutated(selectedTable);
    } catch (err) {
      setErrorMessage(`Gagal insert ke "${selectedTable}": ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Buka Modal Edit
  const handleOpenEdit = (row) => {
    setActiveRow(row);
    setErrorMessage('');
    const editable = { ...row };
    // Format JSON fields untuk form input
    Object.keys(editable).forEach((k) => {
      if (typeof editable[k] === 'object' && editable[k] !== null) {
        editable[k] = JSON.stringify(editable[k]);
      }
    });
    setFormData(editable);
    setJsonInput(JSON.stringify(row, null, 2));
    setFormMode('fields');
    setIsEditModalOpen(true);
  };

  // Eksekusi Simpan Perubahan (UPDATE)
  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    if (!activeRow) return;
    setErrorMessage('');

    let payload = {};
    if (formMode === 'json') {
      try {
        payload = JSON.parse(jsonInput);
      } catch (err) {
        setErrorMessage('Format JSON tidak valid: ' + err.message);
        return;
      }
    } else {
      payload = { ...formData };
      // Jangan timpa primary id
      delete payload.id;
      delete payload.created_at;

      // Parsing field tipe objek / angka jika valid
      Object.keys(payload).forEach((k) => {
        const val = payload[k];
        if (val === 'true') payload[k] = true;
        else if (val === 'false') payload[k] = false;
        else if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try {
            payload[k] = JSON.parse(val);
          } catch {}
        } else if (!isNaN(Number(val)) && typeof val === 'string' && val.trim() !== '' && (k.includes('price') || k.includes('amount') || k.includes('duration') || k.includes('balance'))) {
          payload[k] = Number(val);
        }
      });
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from(selectedTable)
        .update(payload)
        .eq('id', activeRow.id);

      if (error) throw error;

      showToast(`Sukses memperbarui data ID "${activeRow.id}" di "${selectedTable}"!`);
      setIsEditModalOpen(false);
      fetchTableData(selectedTable);
      if (typeof onDataMutated === 'function') onDataMutated(selectedTable);
    } catch (err) {
      setErrorMessage(`Gagal update: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Buka Modal Hapus
  const handleOpenDelete = (row) => {
    setActiveRow(row);
    setErrorMessage('');
    setIsDeleteModalOpen(true);
  };

  // Eksekusi Hapus (DELETE)
  const handleConfirmDelete = async () => {
    if (!activeRow) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from(selectedTable)
        .delete()
        .eq('id', activeRow.id);

      if (error) throw error;

      showToast(`Data ID "${activeRow.id}" berhasil dihapus dari "${selectedTable}"!`);
      setIsDeleteModalOpen(false);
      setRows((prev) => prev.filter((r) => r.id !== activeRow.id));
      fetchCounts();
      if (typeof onDataMutated === 'function') onDataMutated(selectedTable);
    } catch (err) {
      setErrorMessage(`Gagal menghapus data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Ekspor ke CSV
  const handleExportCsv = () => {
    if (rows.length === 0) return;
    const headerRow = columns.join(',');
    const bodyRows = rows.map((r) => {
      return columns.map((col) => {
        let val = r[col];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') val = JSON.stringify(val);
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...bodyRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `supabase_${selectedTable}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Ekspor CSV tabel ${selectedTable} berhasil diunduh!`);
  };

  // Format Tampilan Nilai Cell
  const renderCellContent = (value, colName) => {
    if (value === null || value === undefined) {
      return <span className="text-neutral-300 italic font-mono text-[10px]">null</span>;
    }
    if (typeof value === 'boolean') {
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
          value ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'TRUE' : 'FALSE'}
        </span>
      );
    }
    if (colName === 'id') {
      const isCopied = copiedId === value;
      return (
        <div className="flex items-center gap-1 font-mono text-[11px] text-neutral-600">
          <span className="truncate max-w-[120px]">{String(value)}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(String(value));
              setCopiedId(value);
              setTimeout(() => setCopiedId(null), 2000);
            }}
            className="hover:text-black p-0.5 rounded hover:bg-neutral-200 transition-colors cursor-pointer"
            title="Salin ID"
          >
            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      );
    }
    if (colName.includes('price') || colName.includes('amount') || colName.includes('balance')) {
      return (
        <span className="font-mono font-bold text-neutral-900 text-xs">
          Rp {Number(value || 0).toLocaleString('id-ID')}
        </span>
      );
    }
    if (typeof value === 'object') {
      const isArr = Array.isArray(value);
      return (
        <button
          type="button"
          onClick={() => {
            setActiveRow({ key: colName, data: value });
            setIsJsonModalOpen(true);
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-mono text-[10px] font-semibold transition-colors cursor-pointer"
        >
          <span>{isArr ? `Array(${value.length})` : 'Object { ... }'}</span>
          <Eye className="w-2.5 h-2.5 text-neutral-500" />
        </button>
      );
    }
    if (colName.includes('photo') || colName.includes('image_url') || colName.includes('banner')) {
      if (typeof value === 'string' && value.startsWith('http')) {
        return (
          <a href={value} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:underline text-emerald-700 text-xs">
            <img src={value} alt="" className="w-6 h-6 rounded-md object-cover border border-neutral-200" />
            <span className="truncate max-w-[100px] text-[10px]">Preview</span>
          </a>
        );
      }
    }
    if (colName.includes('status')) {
      const s = String(value).toUpperCase();
      let color = 'bg-neutral-100 text-neutral-700';
      if (s === 'PAID' || s === 'ACTIVE' || s === 'SELESAI' || s === 'AVAILABLE' || s === 'COMPLETED') {
        color = 'bg-emerald-100 text-emerald-800';
      } else if (s === 'PENDING' || s === 'MENUNGGU' || s === 'PENDING_PAYMENT' || s === 'UNPAID') {
        color = 'bg-amber-100 text-amber-800';
      } else if (s === 'EXPIRED' || s === 'CANCELLED' || s === 'INACTIVE') {
        color = 'bg-rose-100 text-rose-800';
      }
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${color}`}>
          {String(value)}
        </span>
      );
    }
    return <span className="truncate max-w-[180px] block text-xs">{String(value)}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi Sukses */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#285844] text-white shadow-2xl flex items-center gap-3 border border-emerald-400/30 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* Header Supabase Studio */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-[#1b3d2f] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-neutral-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Supabase Live Studio</span>
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>natgqaksuousldfxydnr.supabase.co</span>
              </span>
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-white">
              Database Studio & CRUD Explorer
            </h2>
            <p className="text-xs text-neutral-300 max-w-xl leading-relaxed">
              Pantau seluruh tabel database Supabase secara *realtime*. Anda memiliki wewenang penuh untuk membuat data baru (**Create**), membaca (**Read**), mengedit field (**Update**), dan menghapus baris (**Delete**).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Tambah Data ({selectedTable})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                fetchTableData(selectedTable);
                fetchCounts();
              }}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10"
              title="Refresh Data Langsung dari Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={rows.length === 0}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer border border-white/10 disabled:opacity-40"
              title="Unduh CSV"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigasi Pilihan Tabel Supabase */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-neutral-700 uppercase font-mono tracking-wider flex items-center gap-1.5">
            <Table className="w-3.5 h-3.5 text-neutral-500" />
            <span>Pilih Tabel Database Supabase</span>
          </label>
          <span className="text-xs text-neutral-400 font-mono">
            {rows.length} Baris Dimuat
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {KNOWN_TABLES.map((t) => {
            const isSelected = selectedTable === t.id;
            const count = tableCounts[t.id];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTable(t.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#285844] border-[#285844] text-white shadow-md shadow-[#285844]/20'
                    : 'bg-white border-neutral-200 text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`font-mono text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                    {t.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-700'
                  }`}>
                    {count !== undefined ? count : '...'}
                  </span>
                </div>
                <p className={`text-[11px] truncate ${isSelected ? 'text-neutral-200' : 'text-neutral-500'}`}>
                  {t.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bar Pencarian & Filter Kontrol */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Cari apa saja di tabel ${selectedTable}...`}
            className="w-full pl-9 pr-8 py-2 bg-neutral-50 border border-neutral-200 focus:border-[#285844] rounded-xl text-xs outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black cursor-pointer text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono w-full sm:w-auto justify-end">
          <span>Menampilkan {filteredRows.length} dari {rows.length} record</span>
        </div>
      </div>

      {/* Alert Error jika Ada */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Terjadi Kesalahan Operasi Database</p>
            <p className="text-[11px] mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-red-500 hover:text-red-800 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabel Data Explorer */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        {loading && (
          <div className="p-12 text-center text-neutral-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#285844]" />
            <p className="text-xs font-mono">Memuat data tabel "{selectedTable}" dari Supabase...</p>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="p-12 text-center text-neutral-400 space-y-3">
            <Database className="w-10 h-10 mx-auto text-neutral-300 stroke-1" />
            <div>
              <p className="font-bold text-neutral-700 text-sm">Tabel ini Masih Kosong</p>
              <p className="text-xs text-neutral-400">Belum ada baris data di tabel "{selectedTable}".</p>
            </div>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#285844] text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris Pertama</span>
            </button>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold text-center w-24">Aksi</th>
                  {columns.map((col) => (
                    <th key={col} className="py-3 px-4 font-bold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredRows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-neutral-50/80 transition-colors">
                    {/* Kolom Aksi CRUD */}
                    <td className="py-2.5 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(row)}
                          className="p-1.5 rounded-lg text-neutral-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Edit Baris Data"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(row)}
                          className="p-1.5 rounded-lg text-neutral-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Hapus Baris Data"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Seluruh Kolom Data */}
                    {columns.map((col) => (
                      <td key={col} className="py-2.5 px-4 whitespace-nowrap text-neutral-700">
                        {renderCellContent(row[col], col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL 1: TAMBAH DATA BARU (CREATE)           */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900">
                    Tambah Record Baru ({selectedTable})
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-mono">Insert langsung ke Supabase</p>
                </div>
              </div>

              {/* Mode Toggle Form vs JSON */}
              <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setFormMode('fields')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    formMode === 'fields' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-500'
                  }`}
                >
                  Form
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormMode('json');
                    setJsonInput(JSON.stringify(formData, null, 2));
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    formMode === 'json' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-500'
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveNew} className="flex-1 overflow-y-auto space-y-4 pr-1">
              {formMode === 'fields' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {columns.filter(col => col !== 'id' && col !== 'created_at' && col !== 'updated_at').map((col) => (
                    <div key={col} className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-neutral-600 block truncate">
                        {col}
                      </label>
                      <input
                        type="text"
                        value={formData[col] ?? ''}
                        onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                        placeholder={`Nilai untuk ${col}`}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:border-[#285844] rounded-xl text-xs outline-none font-mono"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold text-neutral-600">Payload JSON Objek:</label>
                  <textarea
                    rows={12}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    className="w-full p-3 font-mono text-xs bg-neutral-900 text-emerald-400 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-bold hover:bg-neutral-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-[#285844] hover:bg-[#1e4334] text-white text-xs font-bold shadow-md shadow-[#285844]/20 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan ke Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL 2: EDIT DATA (UPDATE)                  */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isEditModalOpen && activeRow && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900">
                    Edit Data ({selectedTable})
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-mono">ID: {activeRow.id}</p>
                </div>
              </div>

              {/* Toggle Form vs JSON */}
              <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setFormMode('fields')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    formMode === 'fields' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-500'
                  }`}
                >
                  Form
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormMode('json');
                    setJsonInput(JSON.stringify(formData, null, 2));
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    formMode === 'json' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-500'
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto space-y-4 pr-1">
              {formMode === 'fields' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {columns.filter(col => col !== 'id' && col !== 'created_at').map((col) => (
                    <div key={col} className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-neutral-600 block truncate">
                        {col}
                      </label>
                      <input
                        type="text"
                        value={formData[col] ?? ''}
                        onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 focus:border-[#285844] rounded-xl text-xs outline-none font-mono"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold text-neutral-600">Payload JSON Objek:</label>
                  <textarea
                    rows={12}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    className="w-full p-3 font-mono text-xs bg-neutral-900 text-emerald-400 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-bold hover:bg-neutral-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Perbarui ke Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL 3: KONFIRMASI HAPUS (DELETE)           */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isDeleteModalOpen && activeRow && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-neutral-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-neutral-900">
                Hapus Data dari "{selectedTable}"?
              </h3>
              <p className="text-xs text-neutral-500">
                Tindakan ini permanen dan akan menghapus baris ID:
              </p>
              <div className="p-2 bg-neutral-100 rounded-xl font-mono text-[11px] text-neutral-700 break-all">
                {activeRow.id}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-bold hover:bg-neutral-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={loading}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MODAL 4: JSON VIEWER POPUP                   */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isJsonModalOpen && activeRow && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-950 text-neutral-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-neutral-800">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="font-mono text-xs font-bold text-emerald-400">
                {activeRow.key} (JSON Viewer)
              </span>
              <button
                type="button"
                onClick={() => setIsJsonModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs font-mono overflow-auto max-h-96 text-emerald-300">
              {JSON.stringify(activeRow.data, null, 2)}
            </pre>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(JSON.stringify(activeRow.data, null, 2));
                showToast('JSON berhasil disalin ke clipboard!');
                setIsJsonModalOpen(false);
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin JSON</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

