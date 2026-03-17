// 데이터 배열을 ASCII 블록 스파크라인으로 변환
// [2, 5, 8, 12, 6, ...] → "▂▃▅█▆..."
const BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export function toSparkline(data, key = 'count') {
  if (!data || data.length === 0) return '';
  const values = data.map(d => (typeof d === 'number' ? d : d[key]) || 0);
  const max = Math.max(...values, 1);
  return values.map(v => BLOCKS[Math.min(Math.floor((v / max) * 7.99), 7)]).join('');
}
