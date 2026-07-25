import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const O = '#E8520A'
const G = '#2E7D32'

export function DemandesBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={6}>
        <CartesianGrid vertical={false} stroke="#F4F6F9" />
        <XAxis dataKey="mois" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} allowDecimals={false} />
        <Tooltip cursor={{ fill: '#F4F6F9' }} contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 13 }} />
        <Bar dataKey="demandes" name="Demandes logement" fill={O} radius={[8, 8, 0, 0]} />
        <Bar dataKey="tickets" name="Tickets maintenance" fill={G} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function OccupationPieChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={65} outerRadius={90} paddingAngle={2} startAngle={90} endAngle={-270}>
          {data.map(d => <Cell key={d.name} fill={d.color} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}
