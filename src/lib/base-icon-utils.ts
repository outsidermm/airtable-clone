export const BASE_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-red-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-violet-500",
];

export function getBaseColor(baseId: string): string {
  // Hash string to consistent index
  let hash = 0;
  for (let i = 0; i < baseId.length; i++) {
    hash = baseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BASE_COLORS.length;
  return BASE_COLORS[index];
}
