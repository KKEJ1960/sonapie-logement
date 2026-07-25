import { useMemo } from 'react'
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export function Sparkline({ data, color }) {
  const chartData = useMemo(() => (data || []).map((v, i) => ({ i, v })), [data])
  if (!chartData.length) return <div className="h-8" />
  return (
    <div className="h-8 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RepartitionPieChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={2}>
          {data.map(d => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function DelaiAreaChart({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height={110}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="dirAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#dirAreaGradient)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
