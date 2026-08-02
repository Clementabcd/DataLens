import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import FileImport, { ExampleDatasetsGrid, type ExampleDataset } from './components/FileImport';
import ComparisonView from './components/ComparisonView';
import ResultsView from './components/ResultsView';
import HomeScreen, { type ToolId } from './components/HomeScreen';
import QuickCheck from './components/QuickCheck';
import { detectNumericColumns, extractDataset, parseFile, type ParsedTable } from './core/fileParser';

const TOOL_TITLES: Record<ToolId, string> = {
  file: 'Vérifier un fichier',
  quick: 'Tester une liste de nombres',
  compare: 'Comparer plusieurs sources',
};

function App() {
  const [tool, setTool] = useState<ToolId | 'home'>('home');

  const [table, setTable] = useState<ParsedTable | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [numericColumns, setNumericColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ingestFile(file: File) {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = await parseFile(file);
      const numeric = detectNumericColumns(parsed);
      if (numeric.length === 0) {
        setError('Aucune colonne numérique exploitable détectée dans ce fichier.');
        setTable(null);
        return;
      }
      setTable(parsed);
      setFileName(file.name);
      setNumericColumns(numeric);
      setSelectedColumn(numeric[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'import du fichier.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExampleSelected(example: ExampleDataset) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}examples/${example.file}`);
      const blob = await res.blob();
      const file = new File([blob], example.file, { type: 'text/csv' });
      await ingestFile(file);
    } catch {
      setError("Impossible de charger l'exemple.");
    } finally {
      setIsLoading(false);
    }
  }

  const dataset = useMemo(() => {
    if (!table || !selectedColumn) return null;
    return extractDataset(table, selectedColumn);
  }, [table, selectedColumn]);

  function goHome() {
    setTool('home');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <button onClick={goHome} className="flex items-center gap-2 group">
            <div className="text-ink-900 text-lg tracking-tight group-hover:text-accent-strong transition-colors">
              DataLens
            </div>
          </button>
          <div className="text-ink-300 text-xs font-data hidden sm:block">
            analyse déterministe · aucune intelligence artificielle
          </div>
        </div>
        {tool !== 'home' && (
          <div className="max-w-6xl mx-auto px-6 pb-4 flex items-center gap-3">
            <button
              onClick={goHome}
              className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
            >
              <ArrowLeft size={15} /> Accueil
            </button>
            <span className="text-ink-300">/</span>
            <span className="text-sm text-ink-900">{TOOL_TITLES[tool]}</span>
            {fileName && tool === 'file' && (
              <span className="text-xs font-data text-ink-300 ml-auto truncate max-w-[220px]">
                {fileName}
              </span>
            )}
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {tool === 'home' && <HomeScreen onSelectTool={setTool} />}

        {tool === 'file' && (
          <div className="space-y-8">
            {!table && (
              <div className="space-y-8">
                <FileImport onFileSelected={ingestFile} isLoading={isLoading} errorMessage={error} />
                <ExampleDatasetsGrid onExampleSelected={handleExampleSelected} />
              </div>
            )}

            {table && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs uppercase tracking-wider text-ink-500">
                    Colonne analysée
                  </span>
                  <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="panel rounded-lg px-3 py-2 text-sm text-ink-900 font-data"
                  >
                    {numericColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setTable(null);
                      setError(null);
                    }}
                    className="ml-auto text-xs text-ink-500 hover:text-accent transition-colors"
                  >
                    Importer un autre fichier
                  </button>
                </div>

                {dataset && (
                  <ResultsView
                    label={dataset.columnName}
                    values={dataset.values}
                    missingCount={dataset.rawCount - dataset.values.length}
                  />
                )}
              </>
            )}
          </div>
        )}

        {tool === 'quick' && <QuickCheck />}

        {tool === 'compare' && (
          <ComparisonView currentTable={table} currentNumericColumns={numericColumns} />
        )}
      </main>
    </div>
  );
}

export default App;
