import type { InterventionStatus, InterventionType, MovementReason } from "@/db/schema";
import type { Tone } from "@/lib/format";

export const CATEGORIES = [
  { id: "camera", label: "Caméras" },
  { id: "enregistreur", label: "Enregistreurs (NVR / DVR)" },
  { id: "stockage", label: "Disques et stockage" },
  { id: "alarme", label: "Alarmes et détecteurs" },
  { id: "acces", label: "Contrôle d'accès et interphonie" },
  { id: "domotique", label: "Maison intelligente" },
  { id: "reseau", label: "Réseau et alimentation" },
  { id: "cable", label: "Câbles et accessoires" },
  { id: "service", label: "Main d'oeuvre et forfaits" },
  { id: "autre", label: "Autre" },
] as const;

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [string, ...string[]];

export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? "Autre";

export const INTERVENTION_TYPES: { id: InterventionType; label: string }[] = [
  { id: "installation", label: "Installation" },
  { id: "maintenance", label: "Maintenance" },
  { id: "depannage", label: "Dépannage" },
  { id: "visite", label: "Visite technique" },
];

export const INTERVENTION_STATUSES: { id: InterventionStatus; label: string; tone: Tone }[] = [
  { id: "planifiee", label: "Planifiée", tone: "info" },
  { id: "en_cours", label: "En cours", tone: "warn" },
  { id: "terminee", label: "Terminée", tone: "good" },
  { id: "annulee", label: "Annulée", tone: "neutral" },
];

export const interventionTypeLabel = (id: InterventionType) =>
  INTERVENTION_TYPES.find((t) => t.id === id)?.label ?? id;

export const interventionStatus = (id: InterventionStatus) =>
  INTERVENTION_STATUSES.find((s) => s.id === id) ?? INTERVENTION_STATUSES[0];

export const MOVEMENT_LABELS: Record<MovementReason, string> = {
  entree: "Entrée de stock",
  sortie: "Sortie de stock",
  facture: "Vente (facture)",
  annulation: "Annulation de facture",
  commande: "Réception fournisseur",
  inventaire: "Correction d'inventaire",
  defaut: "Défectueux / retour SAV",
};
