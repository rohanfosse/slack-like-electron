// Etat global de l'application — source de verite unique
export const state = {
  // Identite connectee
  currentUser: null,          // { id, name, avatar_initials, type: 'teacher'|'student', promo_id, promo_name }

  // Navigation
  activeChannelId:    null,   // canal de chat actif
  activeDmStudentId:  null,   // etudiant DM actif
  activePromoId:      null,   // promo du contexte courant
  activeChannelType:  'chat', // 'chat' | 'annonce'

  // Panels & modals
  rightPanel:         null,   // 'travaux' | 'profil' | null
  currentTravailId:   null,   // travail ouvert dans la modal depots/suivi
  pendingNoteDepotId: null,   // depot en attente de notation

  // Recherche
  searchActive:       false,  // barre de recherche visible

  // Non-lus (channelId -> count)
  unread:             {},
};
