import { Alert, Card, Progress, Skeleton, Table } from 'antd';
import { partnerApi } from '../../api';
import useAsync from '../../hooks/useAsync';
import StatCards from '../../components/dashboard/StatCards';
import RevenueCharts from '../../components/dashboard/RevenueCharts';
import { formatDateTime, formatINR } from '../../utils/format';

/** Partner KPIs, revenue trend and occupancy of the next shows. */
export default function PartnerOverview() {
  const stats = useAsync(() => partnerApi.stats().then((r) => r.data), []);

  if (stats.error) return <Alert type="error" showIcon title={stats.error.message} />;
  if (!stats.data) return <Skeleton active />;

  const { summary, theatres, daily, topMovies, upcoming } = stats.data;

  return (
    <>
      {theatres.pending > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title={`${theatres.pending} theatre(s) awaiting admin approval. You can schedule shows once approved.`}
        />
      )}
      <StatCards
        items={[
          { title: 'Ticket revenue', value: summary.revenue, formatter: (v) => formatINR(v) },
          { title: 'Tickets sold', value: summary.tickets },
          { title: 'Bookings', value: summary.bookings },
          { title: 'Approved theatres', value: theatres.approved || 0 },
        ]}
      />
      <RevenueCharts daily={daily} topMovies={topMovies} />

      <Card size="small" title="Upcoming shows" style={{ marginTop: 16 }}>
        <Table
          size="small"
          rowKey="showId"
          pagination={false}
          dataSource={upcoming}
          scroll={{ x: 600 }}
          columns={[
            { title: 'Movie', dataIndex: 'movie' },
            { title: 'Theatre', dataIndex: 'theatre', render: (t, r) => `${t} · Screen ${r.screen}` },
            { title: 'Starts', dataIndex: 'startTime', render: formatDateTime },
            {
              title: 'Occupancy',
              dataIndex: 'occupancy',
              width: 220,
              render: (pct, r) => (
                <Progress percent={pct} size="small" format={() => `${r.booked}/${r.total}`} strokeColor="#f84464" />
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
