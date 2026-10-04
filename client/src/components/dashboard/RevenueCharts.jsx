import { Card, Col, Empty, Row } from 'antd';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatINR, dayjs } from '../../utils/format';

const BRAND = '#f84464';
const AXIS = { fontSize: 11, fill: '#6b6f80' };
const compactINR = (v) => (v >= 1000 ? `₹${Math.round(v / 100) / 10}k` : `₹${v}`);

/**
 * Daily revenue trend plus top movies by revenue.
 * @param {{ daily: { date: string, revenue: number, tickets: number }[],
 *           topMovies: { title: string, revenue: number, tickets: number }[] }} props
 */
export default function RevenueCharts({ daily, topMovies }) {
  const series = daily.map((d) => ({ ...d, label: dayjs(d.date).format('D MMM') }));

  return (
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col xs={24} lg={15}>
        <Card size="small" title="Ticket revenue · last 14 days">
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eee" />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compactINR} width={48} />
                <Tooltip
                  formatter={(value, name) => (name === 'revenue' ? [formatINR(value), 'Revenue'] : [value, 'Tickets'])}
                />
                <Area type="monotone" dataKey="revenue" stroke={BRAND} strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Col>
      <Col xs={24} lg={9}>
        <Card size="small" title="Top movies by revenue">
          <div className="chart-box">
            {topMovies.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMovies} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="#eee" />
                  <XAxis type="number" tick={AXIS} tickFormatter={compactINR} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="title" tick={AXIS} width={110} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [formatINR(value), 'Revenue']} />
                  <Bar dataKey="revenue" fill={BRAND} radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No sales yet" />
            )}
          </div>
        </Card>
      </Col>
    </Row>
  );
}
