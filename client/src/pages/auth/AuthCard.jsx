import { Card, Typography } from 'antd';

/** Centred card shared by the login, register and password reset screens. */
export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <Card className="auth-card">
        <Typography.Title level={3} style={{ marginBottom: 4 }}>
          {title}
        </Typography.Title>
        {subtitle && (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
            {subtitle}
          </Typography.Paragraph>
        )}
        {children}
      </Card>
    </div>
  );
}
