export const BASE_COLORS = [
  "bg-red-300",
  "bg-orange-300",
  "bg-yellow-300",
  "bg-green-300",
  "bg-cyan-300",
  "bg-blue-300",
  "bg-indigo-300",
  "bg-purple-300",
  "bg-pink-300",
  "bg-gray-300",
  "bg-red-600",
  "bg-orange-600",
  "bg-yellow-600",
  "bg-green-600",
  "bg-cyan-600",
  "bg-blue-600",
  "bg-indigo-600",
  "bg-purple-600",
  "bg-pink-600",
  "bg-gray-600",
  "bg-red-900",
  "bg-orange-900",
  "bg-yellow-900",
  "bg-green-900",
  "bg-cyan-900",
  "bg-blue-900",
  "bg-indigo-900",
  "bg-purple-900",
  "bg-pink-900",
  "bg-gray-900",
];

export function getBaseColor(baseId: string): string {
  // Hash string to consistent index
  let hash = 0;
  for (let i = 0; i < baseId.length; i++) {
    hash = baseId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BASE_COLORS.length;
  return BASE_COLORS[index] ?? BASE_COLORS[0]!;
}
