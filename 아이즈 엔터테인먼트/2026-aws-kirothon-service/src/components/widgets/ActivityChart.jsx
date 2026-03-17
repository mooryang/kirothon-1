'use client';

import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

const DEFAULT_DATA = [
  { time: '19:00', count: 2 },
  { time: '20:00', count: 5 },
  { time: '21:00', count: 8 },
  { time: '22:00', count: 12 },
  { time: '23:00', count: 6 },
  { time: '00:00', count: 3 },
  { time: '01:00', count: 15 },
  { time: '02:00', count: 4 },
  { time: '03:00', count: 7 },
  { time: '04:00', count: 2 },
  { time: '05:00', count: 1 },
  { time: '06:00', count: 9 },
];

export default function ActivityChart({ data }) {
  const chartData = data || DEFAULT_DATA;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
        <Tooltip
          contentStyle={{
            background: '#0a0a0a',
            border: '1px solid #333',
            color: '#00ff41',
            fontFamily: 'JetBrains Mono',
            fontSize: 10,
          }}
        />
        <Area
          type="stepAfter"
          dataKey="count"
          stroke="#00ff41"
          fill="rgba(0,255,65,0.1)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
