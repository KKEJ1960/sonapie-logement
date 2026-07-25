import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

export function RoleDistributionPieChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.role} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#131C31', border: '1px solid #1E2A45', borderRadius: 8, color: '#F1F5F9' }}
          labelStyle={{ color: '#F1F5F9' }}
          itemStyle={{ color: '#F1F5F9' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
