import { Card, Col, Row, Statistic } from 'antd';

/**
 * Row of KPI tiles.
 * @param {{ items: { title: string, value: number|string, prefix?: React.ReactNode, formatter?: (v: number) => string }[] }} props
 */
export default function StatCards({ items }) {
  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col key={item.title} xs={12} md={6}>
          <Card size="small" className="stat-card">
            <Statistic title={item.title} value={item.value} prefix={item.prefix} formatter={item.formatter} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}
