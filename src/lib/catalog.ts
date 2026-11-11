import type { InterventionStatus, InterventionType, MovementReason } from "@/db/schema";
import type { Tone } from "@/lib/format";

export const CATEGORIES = [
  { id: "camera", label: "Cameras" },
  { id: "enregistreur", label: "Recorders (NVR / DVR)" },
  { id: "stockage", label: "Drives & storage" },
  { id: "alarme", label: "Alarms & detectors" },
  { id: "acces", label: "Access control & intercoms" },
  { id: "domotique", label: "Smart home" },
  { id: "reseau", label: "Network & power" },
  { id: "cable", label: "Cables & accessories" },
  { id: "service", label: "Labour & packages" },
  { id: "autre", label: "Other" },
] as const;

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [string, ...string[]];

export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? "Other";

export const INTERVENTION_TYPES: { id: InterventionType; label: string }[] = [
  { id: "installation", label: "Installation" },
  { id: "maintenance", label: "Maintenance" },
  { id: "depannage", label: "Repair" },
  { id: "visite", label: "Site survey" },
];

export const INTERVENTION_STATUSES: { id: InterventionStatus; label: string; tone: Tone }[] = [
  { id: "planifiee", label: "Scheduled", tone: "info" },
  { id: "en_cours", label: "In progress", tone: "warn" },
  { id: "terminee", label: "Completed", tone: "good" },
  { id: "annulee", label: "Cancelled", tone: "neutral" },
];

export const interventionTypeLabel = (id: InterventionType) =>
  INTERVENTION_TYPES.find((t) => t.id === id)?.label ?? id;

export const interventionStatus = (id: InterventionStatus) =>
  INTERVENTION_STATUSES.find((s) => s.id === id) ?? INTERVENTION_STATUSES[0];

export const MOVEMENT_LABELS: Record<MovementReason, string> = {
  entree: "Stock in",
  sortie: "Stock out",
  facture: "Sale (invoice)",
  annulation: "Invoice cancelled",
  commande: "Supplier delivery",
  inventaire: "Stock count correction",
  defaut: "Faulty / returned",
};
