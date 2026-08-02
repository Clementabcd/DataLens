import { useCallback, useState } from 'react';

export interface ExampleDataset {
  file: string;
  name: string;
  description: string;
}

export const EXAMPLE_DATASETS: ExampleDataset[] = [
  {
    file: 'villes-population.csv',
    name: 'Populations de villes',
    description: 'Cas d\'école Benford — distribution log-uniforme, conforme par construction',
  },
  {
    file: 'comptes-conformes.csv',
    name: 'Comptes fournisseurs (sains)',
    description: 'Montants comptables plausibles, conformes à la loi de Benford',
  },
  {
    file: 'transactions-suspectes.csv',
    name: 'Transactions suspectes',
    description: 'Montants ronds artificiels et biais de chiffres — DataLens Score bas attendu',
  },
  {
    file: 'mesures-laboratoire.csv',
    name: 'Mesures de laboratoire',
    description: 'Distribution normale avec valeurs aberrantes injectées — pour le moteur d\'anomalies',
  },
];

interface FileImportProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export default function FileImport({ onFileSelected, isLoading, errorMessage }: FileImportProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`panel rounded-xl p-12 text-center transition-colors ${
        isDragOver ? 'border-accent/60 bg-surface-2' : ''
      }`}
    >
      <input
        type="file"
        id="file-input"
        className="hidden"
        accept=".csv,.tsv,.json,.xlsx,.xls"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
      <label htmlFor="file-input" className="cursor-pointer">
        <div className="text-ink-900 text-lg mb-1">
          {isLoading ? 'Analyse en cours…' : 'Déposez un jeu de données'}
        </div>
        <div className="text-ink-500 text-sm">.csv · .tsv · .json · .xlsx — traité localement, rien ne quitte votre machine</div>
      </label>
      {errorMessage && <div className="mt-4 text-sm text-accent">{errorMessage}</div>}
    </div>
  );
}

export function ExampleDatasetsGrid({
  onExampleSelected,
}: {
  onExampleSelected: (example: ExampleDataset) => void;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-ink-300 mb-3">
        Ou essayez avec un jeu de données d'exemple
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {EXAMPLE_DATASETS.map((ex) => (
          <button
            key={ex.file}
            onClick={() => onExampleSelected(ex)}
            className="text-left panel rounded-xl p-4 hover:border-accent transition-colors"
          >
            <div className="text-sm text-ink-900">{ex.name}</div>
            <div className="text-xs text-ink-500 mt-1 leading-relaxed">{ex.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
