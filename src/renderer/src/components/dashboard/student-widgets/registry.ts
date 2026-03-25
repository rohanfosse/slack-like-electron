/**
 * registry.ts - Registre des widgets du bento étudiant.
 * Chaque widget est décrit par un id unique, un label, une icône,
 * une description et un état par défaut.
 */
import type { Component } from 'vue'
import {
  Radio, FolderOpen, Award, FileText, Mic,
  MessageSquare, FileBox, Activity,
  Clock, Quote, CalendarDays, TrendingUp, Bookmark, Timer,
  Hourglass, Users,
} from 'lucide-vue-next'

export interface WidgetDef {
  id: string
  label: string
  icon: Component
  description: string
  defaultEnabled: boolean
}

export const STUDENT_WIDGETS: WidgetDef[] = [
  { id: 'live', label: 'Session Live', icon: Radio, description: 'Session interactive en cours', defaultEnabled: true },
  { id: 'project', label: 'Projet en cours', icon: FolderOpen, description: 'Progression du projet actif', defaultEnabled: true },
  { id: 'exams', label: 'Prochaines épreuves', icon: Award, description: 'CCTLs et études de cas à venir', defaultEnabled: true },
  { id: 'livrables', label: 'Prochains livrables', icon: FileText, description: 'Livrables à rendre', defaultEnabled: true },
  { id: 'soutenances', label: 'Soutenances', icon: Mic, description: 'Présentations à venir', defaultEnabled: true },
  { id: 'feedback', label: 'Dernier retour', icon: MessageSquare, description: 'Dernier retour sur un devoir', defaultEnabled: true },
  { id: 'recentDoc', label: 'Document récent', icon: FileBox, description: 'Dernier document partagé', defaultEnabled: true },
  { id: 'promoActivity', label: 'Activité promo', icon: Activity, description: 'Présence et rendus de la promo', defaultEnabled: true },
  // ── Widgets optionnels (désactivés par défaut) ──
  { id: 'clock',      label: 'Horloge',         icon: Clock,        description: 'Heure et date en temps réel',       defaultEnabled: false },
  { id: 'quote',      label: 'Citation du jour', icon: Quote,        description: 'Citation motivante quotidienne',    defaultEnabled: false },
  { id: 'calendar',   label: 'Calendrier',       icon: CalendarDays, description: 'Mini calendrier avec deadlines',    defaultEnabled: false },
  { id: 'progress',   label: 'Progression',      icon: TrendingUp,   description: 'Anneau de progression globale',     defaultEnabled: false },
  { id: 'quicklinks', label: 'Liens rapides',    icon: Bookmark,     description: 'Accès rapide à vos liens favoris', defaultEnabled: false },
  { id: 'pomodoro',   label: 'Pomodoro',         icon: Timer,        description: 'Minuteur de concentration 25/5',    defaultEnabled: false },
  { id: 'grades',     label: 'Mes notes',        icon: Award,        description: 'Dernières notes reçues',             defaultEnabled: false },
  { id: 'bookmarks',  label: 'Sauvegardés',      icon: Bookmark,     description: 'Messages sauvegardés',               defaultEnabled: false },
  { id: 'countdown',  label: 'Compte à rebours', icon: Hourglass,    description: 'Temps restant avant la prochaine deadline', defaultEnabled: false },
  { id: 'group',      label: 'Mon groupe',        icon: Users,        description: 'Membres de votre groupe de projet',  defaultEnabled: false },
]
