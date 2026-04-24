import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Upload,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Search,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

function App() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const formatDate = (val) => {
    if (val instanceof Date) {
      return val.toLocaleDateString('pt-BR');
    }
    if (typeof val === 'number' && val > 40000) {
      // Handle Excel serial dates if not converted to Date objects
      const date = XLSX.utils.format_cell({ v: val, t: 'd' });
      return date;
    }
    return val;
  };

  const processFile = (file) => {
    setLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bstr = e.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Convert to JSON starting from row index 1 to skip the first main header
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, range: 1 });

        if (!rawData || rawData.length === 0) {
          throw new Error("O arquivo está vazio ou não pôde ser lido.");
        }

        // Headers are in the first row of rawData now (index 0 of rawData)
        // A=Dia, B=Vendas (Santher), C=Semana, D=Vendas (Winthor)
        const rows = rawData.slice(1)
          .filter(row => {
            const firstCell = row[0];
            if (firstCell === undefined || firstCell === null || firstCell === '') return false;

            // Convert to string to check for keywords
            const strValue = String(firstCell).toUpperCase();
            if (strValue.includes('TOTAL') || strValue.includes('DIA')) return false;

            return true;
          })
          .map(row => {
            const vSanther = typeof row[1] === 'number' ? row[1] : parseFloat(String(row[1]).replace(/[^\d.-]/g, '')) || 0;
            const vWinthor = typeof row[3] === 'number' ? row[3] : parseFloat(String(row[3]).replace(/[^\d.-]/g, '')) || 0;

            return {
              dia: formatDate(row[0]),
              vendasSanther: vSanther,
              semana: row[2],
              vendasWinthor: vWinthor,
              diferenca: vSanther - vWinthor
            };
          });

        if (rows.length === 0) {
          throw new Error("Nenhum dado válido encontrado na planilha.");
        }

        const totalSanther = rows.reduce((acc, row) => acc + row.vendasSanther, 0);
        const totalWinthor = rows.reduce((acc, row) => acc + row.vendasWinthor, 0);
        const totalDif = totalSanther - totalWinthor;

        const diffPercentage = totalWinthor !== 0 ? Math.abs((totalSanther / totalWinthor) - 1) : 0;
        const divergentes = rows.filter(r => {
          if (r.vendasWinthor === 0) return r.vendasSanther !== 0;
          return Math.abs((r.vendasSanther / r.vendasWinthor) - 1) > 0.01;
        }).length;

        setStats({
          totalSanther,
          totalWinthor,
          totalDif,
          diffPercentage,
          divergentes,
          accuracy: rows.length > 0 ? ((1 - (divergentes / rows.length)) * 100).toFixed(1) : 0
        });
        setData(rows);
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        alert(error.message || "Erro ao ler o arquivo. Verifique se o formato está correto.");
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      alert("Erro ao ler o arquivo.");
      setLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      processFile(file);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };


  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <img src="/logo-dia.png" alt="Logo Dia Distribuidora" style={{ height: '50px', objectFit: 'contain' }} />
          <div style={{ height: '40px', width: '2px', background: 'rgba(0, 45, 114, 0.1)', margin: '0 0.5rem' }}></div>
          <div>
            <h1>Validação de Faturamento</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>MTRIX vs Winthor</p>
          </div>
        </div>
        {data.length > 0 && (
          <button className="btn-primary" onClick={() => { setData([]); setStats(null); }}>
            <RefreshCw size={18} /> Novo Arquivo
          </button>
        )}
      </header>

      <main>
        {!data.length ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => document.getElementById('fileInput').click()}
          >
            <input
              type="file"
              id="fileInput"
              hidden
              onChange={(e) => e.target.files[0] && processFile(e.target.files[0])}
              accept=".xlsx, .xls"
            />
            {loading ? (
              <span className="loader"></span>
            ) : (
              <>
                <Upload size={48} color="var(--secondary)" style={{ marginBottom: '1rem' }} />
                <h3>Arraste sua planilha aqui</h3>
                <p style={{ color: 'var(--text-muted)' }}>Ou clique para selecionar o arquivo (Excel .xlsx)</p>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="stats-grid">
              <div className="glass stat-card">
                <span className="stat-label">Total MTRIX</span>
                <span className="stat-value">{stats && formatCurrency(stats.totalSanther)}</span>
              </div>
              <div className="glass stat-card">
                <span className="stat-label">Total Winthor (Dia)</span>
                <span className="stat-value">{stats && formatCurrency(stats.totalWinthor)}</span>
              </div>
              <div className="glass stat-card" style={{ borderLeft: `4px solid ${stats && Math.abs(stats.totalDif) < 1 ? 'var(--success)' : 'var(--danger)'}` }}>
                <span className="stat-label">Diferença Total (R$)</span>
                <span className={`stat-value ${stats && Math.abs(stats.totalDif) > 1 ? 'danger' : ''}`}>
                  {stats && formatCurrency(stats.totalDif)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {stats && Math.abs(stats.totalDif) < 1 ? (
                    <CheckCircle2 size={16} color="var(--success)" />
                  ) : (
                    <AlertCircle size={16} color="var(--danger)" />
                  )}
                  <span style={{ fontSize: '0.875rem' }}>
                    {stats && stats.divergentes} dias com divergência
                  </span>
                </div>
              </div>
              <div className="glass stat-card" style={{ borderLeft: `4px solid ${stats && stats.diffPercentage <= 0.01 ? 'var(--success)' : 'var(--danger)'}` }}>
                <span className="stat-label">Diferença Percentual</span>
                <span className={`stat-value ${stats && stats.diffPercentage > 0.01 ? 'danger' : ''}`}>
                  {stats && (stats.diffPercentage * 100).toFixed(2)}%
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {stats && stats.diffPercentage <= 0.01 ? (
                    <CheckCircle2 size={16} color="var(--success)" />
                  ) : (
                    <AlertCircle size={16} color="var(--danger)" />
                  )}
                  <span style={{ fontSize: '0.875rem' }}>
                    {stats && (stats.diffPercentage <= 0.01 ? 'Abaixo do limite de 1%' : 'Acima do limite de 1%')}
                  </span>
                </div>
              </div>
            </div>


            <div className="glass table-wrapper">
              <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0, 45, 114, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Search size={20} /> Detalhamento por Dia
                </h3>
                <div className="badge badge-success">Acuracidade: {stats && stats.accuracy}%</div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Dia</th>
                    <th>MTRIX</th>
                    <th>Winthor (DIA)</th>
                    <th>Diferença (R$)</th>
                    <th>Diferença (%)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => {
                    const rowDiffPct = row.vendasWinthor !== 0 ? Math.abs((row.vendasSanther / row.vendasWinthor) - 1) : (row.vendasSanther !== 0 ? 1 : 0);
                    const isDivergent = rowDiffPct > 0.01;
                    return (
                      <tr key={idx} className={isDivergent ? 'divergent' : ''}>
                        <td>{row.dia}</td>
                        <td>{formatCurrency(row.vendasSanther)}</td>
                        <td>{formatCurrency(row.vendasWinthor)}</td>
                        <td style={{ color: isDivergent ? 'var(--danger)' : 'inherit', fontWeight: isDivergent ? 700 : 400 }}>
                          {formatCurrency(row.diferenca)}
                        </td>
                        <td style={{ color: isDivergent ? 'var(--danger)' : 'inherit' }}>
                          {(rowDiffPct * 100).toFixed(2)}%
                        </td>
                        <td>
                          {isDivergent ? (
                            <span className="badge badge-danger">Divergente</span>
                          ) : (
                            <span className="badge badge-success">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </main>

      <footer style={{ marginTop: 'auto', padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        &copy; 2026 Dia Distribuidora - Validação Automática de Faturamento
      </footer>
    </div>
  );
}

export default App;
