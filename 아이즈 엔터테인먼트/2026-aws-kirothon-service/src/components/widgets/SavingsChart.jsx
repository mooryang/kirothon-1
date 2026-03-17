'use client';

import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts';

const DEFAULT_DATA = [
  { day: '월', minutes: 45 },
  { day: '화', minutes: 30 },
  { day: '수', minutes: 60 },
  { day: '목', minutes: 25 },
  { day: '금', minutes: 90 },
  { day: '토', minutes: 15 },
  { day: '일', minutes: 0 },
];

export default function SavingsChart({ data }) {
  const chartData = data || DEFAULT_DATA;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
        <XAxis dataKey="day" tick={{ fill: '#00ff41', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: '#0a0a0a',
            border: '1px solid #333',
            color: '#00ff41',
            fontFamily: 'JetBrains Mono',
            fontSize: 10,
          }}
          formatter={(value) => [`${value}분`, '절약']}
        />
        <Bar dataKey="minutes" fill="#00ff41" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
