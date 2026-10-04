import { Button, Form, Input, InputNumber, Select, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

/**
 * Form fragment for editing a show's seat layout: seats per row plus a list
 * of price tiers, each owning a set of row letters.
 * With `pricesOnly`, tiers and rows are locked (tickets already sold).
 */
export default function SeatLayoutEditor({ pricesOnly = false }) {
  return (
    <>
      <Form.Item name={['seatLayout', 'seatsPerRow']} label="Seats per row" rules={[{ required: true }]}>
        <InputNumber min={1} max={40} disabled={pricesOnly} />
      </Form.Item>
      <Form.List name={['seatLayout', 'categories']}>
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name }) => (
              <Space key={key} align="baseline" wrap className="layout-row">
                <Form.Item name={[name, 'name']} rules={[{ required: true, message: 'Tier name' }]}>
                  <Input placeholder="Tier (e.g. Recliner)" disabled={pricesOnly} style={{ width: 140 }} />
                </Form.Item>
                <Form.Item name={[name, 'price']} rules={[{ required: true, message: 'Price' }]}>
                  <InputNumber min={0} max={10000} prefix="₹" style={{ width: 110 }} />
                </Form.Item>
                <Form.Item
                  name={[name, 'rows']}
                  rules={[{ required: true, type: 'array', min: 1, message: 'Add rows' }]}
                  normalize={(rows) => rows.map((r) => r.trim().toUpperCase()).filter((r) => /^[A-Z]{1,2}$/.test(r))}
                >
                  <Select mode="tags" placeholder="Rows (A, B…)" disabled={pricesOnly} style={{ minWidth: 180 }} open={false} tokenSeparators={[',', ' ']} />
                </Form.Item>
                {!pricesOnly && fields.length > 1 && (
                  <MinusCircleOutlined onClick={() => remove(name)} aria-label="Remove tier" />
                )}
              </Space>
            ))}
            {!pricesOnly && fields.length < 6 && (
              <Button type="dashed" onClick={() => add({ name: '', price: 200, rows: [] })} icon={<PlusOutlined />}>
                Add price tier
              </Button>
            )}
          </>
        )}
      </Form.List>
    </>
  );
}
