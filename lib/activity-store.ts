export type ActivityFeature = "Login" | "Inventory" | "Financial" | "User";

export type ActivityLog = {
  id: string;
  actorUsername: string;
  actorName: string;
  feature: ActivityFeature;
  message: string;
  createdAt: string;
};

export function formatActivityTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));

  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "1 hari lalu";
  return `${days} hari lalu`;
}
