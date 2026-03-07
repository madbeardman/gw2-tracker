export function formatCoin(copper: number): string {
  const gold = Math.floor(copper / 10000);
  const silver = Math.floor((copper % 10000) / 100);
  const c = copper % 100;
  return `${gold}g ${silver}s ${c}c`;
}

export function formatPlaytime(seconds: number): string {
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.floor(seconds / 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}
