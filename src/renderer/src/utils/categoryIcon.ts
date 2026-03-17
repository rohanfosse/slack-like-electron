import {
  Monitor, Cog, Database, Wifi, Zap, BarChart2, Globe,
  GraduationCap, Wrench, FileText, BookOpen, Calculator,
  Trophy, Target, Cpu, MessageSquare, Layers, Code2,
} from 'lucide-vue-next'
import type { Component } from 'vue'

export const CATEGORY_ICONS: { key: string; component: Component; label: string }[] = [
  { key: 'monitor',        component: Monitor,       label: 'Informatique'    },
  { key: 'cog',            component: Cog,           label: 'Technique'       },
  { key: 'database',       component: Database,      label: 'Base de données' },
  { key: 'wifi',           component: Wifi,          label: 'Réseaux'         },
  { key: 'zap',            component: Zap,           label: 'Électricité'     },
  { key: 'bar-chart-2',    component: BarChart2,     label: 'Statistiques'    },
  { key: 'globe',          component: Globe,         label: 'International'   },
  { key: 'graduation-cap', component: GraduationCap, label: 'Projet'          },
  { key: 'wrench',         component: Wrench,        label: 'Maintenance'     },
  { key: 'file-text',      component: FileText,      label: 'Documents'       },
  { key: 'book-open',      component: BookOpen,      label: 'Cours'           },
  { key: 'calculator',     component: Calculator,    label: 'Calcul'          },
  { key: 'trophy',         component: Trophy,        label: 'Compétition'     },
  { key: 'target',         component: Target,        label: 'Objectifs'       },
  { key: 'cpu',            component: Cpu,           label: 'Matériel'        },
  { key: 'message-square', component: MessageSquare, label: 'Communication'   },
  { key: 'layers',         component: Layers,        label: 'Général'         },
  { key: 'code-2',         component: Code2,         label: 'Code'            },
]

const _iconMap = new Map(CATEGORY_ICONS.map(i => [i.key, i.component]))

/** Décode une catégorie stockée sous la forme "clé-icône Texte lisible". */
export function parseCategoryIcon(str: string | null | undefined): { icon: Component | null; label: string } {
  if (!str) return { icon: null, label: '' }
  const spaceIdx = str.indexOf(' ')
  if (spaceIdx > 0) {
    const prefix = str.slice(0, spaceIdx)
    const rest   = str.slice(spaceIdx + 1)
    const comp   = _iconMap.get(prefix)
    if (comp) return { icon: comp, label: rest }
  }
  return { icon: null, label: str }
}
