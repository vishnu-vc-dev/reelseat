import { Alert, Skeleton } from 'antd';
import { adminApi } from '../../api';
import useAsync from '../../hooks/useAsync';
import StatCards from '../../components/dashboard/StatCards';
import RevenueCharts from '../../components/dashboard/RevenueCharts';
import { formatINR } from '../../utils/format';

/** Platform-wide KPIs for administrators. */
export default function AdminOverview() {
  const stats = useAsync(() => adminApi.stats().then((r) => r.data), []);

  if (stats.error) return <Alert type="error" showIcon title={stats.error.message} />;
  if (!stats.data) return <Skeleton active />;

  const { users, theatres, activeMovies, summary, daily, topMovies } = stats.data;

  return (
    <>
      {theatres.pending > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={`${theatres.pending} theatre application(s) waiting for review in the Theatres tab.`}
        />
      )}
      <StatCards
        items={[
          { title: 'Gross ticket sales', value: summary.revenue, formatter: (v) => formatINR(v) },
          { title: 'Platform fees earned', value: summary.fees, formatter: (v) => formatINR(v) },
          { title: 'Tickets sold', value: summary.tickets },
          { title: 'Active movies', value: activeMovies },
          { title: 'Customers', value: users.user || 0 },
          { title: 'Partners', value: users.partner || 0 },
          { title: 'Approved theatres', value: theatres.approved || 0 },
          { title: 'Blocked theatres', value: theatres.blocked || 0 },
        ]}
      />
      <RevenueCharts daily={daily} topMovies={topMovies} />
    </>
  );
}
