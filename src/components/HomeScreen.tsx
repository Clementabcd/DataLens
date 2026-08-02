import { FileCheck2, Wand2, GitCompare, ArrowRight } from 'lucide-react';
import BenfordExplainer from './BenfordExplainer';

export type ToolId = 'file' | 'quick' | 'compare';

const TOOLS: {
  id: ToolId;
  icon: typeof FileCheck2;
  title: string;
  description: string;
}[] = [
  {
    id: 'file',
    icon: FileCheck2,
    title: 'Vérifier un fichier',
    description:
      'Importez un fichier Excel, CSV ou JSON et obtenez un diagnostic complet de sa colonne numérique.',
  },
  {
    id: 'quick',
    icon: Wand2,
    title: 'Tester une liste de nombres',
    description:
      'Collez directement une série de nombres (montants, mesures, résultats…) sans fichier à importer.',
  },
  {
    id: 'compare',
    icon: GitCompare,
    title: 'Comparer plusieurs sources',
    description:
      'Confrontez plusieurs fichiers ou plusieurs colonnes d\'un même fichier pour repérer les différences.',
  },
];

export default function HomeScreen({ onSelectTool }: { onSelectTool: (tool: ToolId) => void }) {
  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <h1 className="text-2xl md:text-3xl text-ink-900 tracking-tight mb-3">
          Vos données disent-elles la vérité ?
        </h1>
        <p className="text-ink-500 leading-relaxed">
          DataLens vérifie si un jeu de nombres semble naturel ou s'il porte les traces d'une
          fabrication, d'un arrondi ou d'une modification — en s'appuyant sur des méthodes
          statistiques reproductibles, sans aucune intelligence artificielle.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className="group text-left panel rounded-2xl p-6 hover:border-accent transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center mb-4 text-accent-strong">
                <Icon size={20} />
              </div>
              <div className="text-ink-900 mb-1.5">{tool.title}</div>
              <p className="text-sm text-ink-500 leading-relaxed mb-4">{tool.description}</p>
              <span className="inline-flex items-center gap-1 text-sm text-accent-strong opacity-0 group-hover:opacity-100 transition-opacity">
                Ouvrir <ArrowRight size={14} />
              </span>
            </button>
          );
        })}
      </div>

      <BenfordExplainer />
    </div>
  );
}
