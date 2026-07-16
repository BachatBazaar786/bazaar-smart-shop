import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

export interface OrderItem {
  name: string
  sku?: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

export interface OrderConfirmationProps {
  logoUrl?: string
  siteName?: string
  siteUrl?: string
  orderNumber: string
  customerName?: string
  email: string
  paymentMethod: string
  paymentStatus: string
  status: string
  subtotal: number
  shipping: number
  discount?: number
  total: number
  currency?: string
  items: OrderItem[]
  shippingAddress: {
    full_name: string
    phone?: string
    line1: string
    line2?: string
    city: string
    province?: string
    postal_code?: string
    country?: string
  }
  isAdminCopy?: boolean
  orderUrl?: string
}

const paymentLabels: Record<string, string> = {
  cod: 'Cash on Delivery',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  bank_transfer: 'Bank Transfer',
}

const fmt = (n: number, currency = 'Rs') =>
  `${currency} ${Number(n || 0).toLocaleString('en-PK')}`

export const OrderConfirmationEmail = ({
  logoUrl,
  siteName = 'BachatAtBazaar.pk',
  siteUrl = 'https://bachatatbazaar.pk',
  orderNumber,
  customerName,
  email,
  paymentMethod,
  paymentStatus,
  status,
  subtotal,
  shipping,
  discount = 0,
  total,
  currency = 'Rs',
  items,
  shippingAddress,
  isAdminCopy = false,
  orderUrl,
}: OrderConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isAdminCopy
        ? `New order ${orderNumber} — ${fmt(total, currency)}`
        : `Your ${siteName} order ${orderNumber} is confirmed`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={{ textAlign: 'center', padding: '10px 0 20px' }}>
          {logoUrl ? (
            <Img
              src={logoUrl}
              alt={siteName}
              width="72"
              height="72"
              style={{ borderRadius: '10px', margin: '0 auto' }}
            />
          ) : null}
          <Heading style={h1}>
            {isAdminCopy ? 'New order received' : 'Thank you for your order!'}
          </Heading>
          <Text style={sub}>
            {isAdminCopy
              ? `A new order has been placed on ${siteName}.`
              : `We've received your order and will start processing it right away.`}
          </Text>
          <Text style={orderBadge}>
            Order # <strong style={{ color: '#0a7a3b' }}>{orderNumber}</strong>
          </Text>
        </Section>

        <Section style={card}>
          <Heading as="h2" style={h2}>Order details</Heading>
          {items.map((it, i) => (
            <Section key={i} style={itemRow}>
              <Text style={itemName}>{it.name}</Text>
              <Text style={itemMeta}>
                Qty {it.quantity} · {fmt(it.unit_price, currency)}
                {it.sku ? ` · SKU ${it.sku}` : ''}
              </Text>
              <Text style={itemPrice}>{fmt(it.subtotal, currency)}</Text>
              <Hr style={hr} />
            </Section>
          ))}

          <Section style={totals}>
            <Text style={totalRow}>
              <span>Subtotal</span>
              <span>{fmt(subtotal, currency)}</span>
            </Text>
            {discount > 0 ? (
              <Text style={totalRow}>
                <span>Discount</span>
                <span>- {fmt(discount, currency)}</span>
              </Text>
            ) : null}
            <Text style={totalRow}>
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : fmt(shipping, currency)}</span>
            </Text>
            <Hr style={hr} />
            <Text style={grandTotal}>
              <span>Total</span>
              <span>{fmt(total, currency)}</span>
            </Text>
            <Text style={totalRow}>
              <span>Payment</span>
              <span>
                {paymentLabels[paymentMethod] ?? paymentMethod} ·{' '}
                {paymentStatus.replace(/_/g, ' ')}
              </span>
            </Text>
            <Text style={totalRow}>
              <span>Status</span>
              <span style={{ textTransform: 'capitalize' }}>{status}</span>
            </Text>
          </Section>
        </Section>

        <Section style={card}>
          <Heading as="h2" style={h2}>Delivery address</Heading>
          <Text style={addr}>
            <strong>{shippingAddress.full_name}</strong>
            {shippingAddress.phone ? <><br />{shippingAddress.phone}</> : null}
            <br />{shippingAddress.line1}
            {shippingAddress.line2 ? <><br />{shippingAddress.line2}</> : null}
            <br />
            {shippingAddress.city}
            {shippingAddress.province ? `, ${shippingAddress.province}` : ''}
            {shippingAddress.postal_code ? ` ${shippingAddress.postal_code}` : ''}
            {shippingAddress.country ? <><br />{shippingAddress.country}</> : null}
          </Text>
          {isAdminCopy ? (
            <Text style={addr}>
              <strong>Customer email:</strong>{' '}
              <Link href={`mailto:${email}`} style={link}>{email}</Link>
            </Text>
          ) : null}
        </Section>

        {orderUrl ? (
          <Section style={{ textAlign: 'center', padding: '10px 0 24px' }}>
            <Link href={orderUrl} style={cta}>
              {isAdminCopy ? 'View order in admin' : 'View my order'}
            </Link>
          </Section>
        ) : null}

        <Text style={footer}>
          {isAdminCopy
            ? `This is an automated admin notification from ${siteName}.`
            : (
              <>
                Questions about your order? Reply to this email or contact{' '}
                <Link href="mailto:support@bachatatbazaar.pk" style={link}>
                  support@bachatatbazaar.pk
                </Link>
                .
              </>
            )}
          <br />
          <Link href={siteUrl} style={link}>{siteName}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default OrderConfirmationEmail

export const template = {
  component: OrderConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data.isAdminCopy
      ? `🛒 New order ${data.orderNumber} — ${fmt(data.total || 0, data.currency || 'Rs')}`
      : `Your BachatAtBazaar.pk order ${data.orderNumber} is confirmed`,
  displayName: 'Order confirmation',
  previewData: {
    logoUrl: '',
    siteName: 'BachatAtBazaar.pk',
    siteUrl: 'https://bachatatbazaar.pk',
    orderNumber: 'BAB-10002',
    customerName: 'Tahir Islam',
    email: 'customer@example.com',
    paymentMethod: 'cod',
    paymentStatus: 'unpaid',
    status: 'pending',
    subtotal: 990,
    shipping: 250,
    total: 1240,
    currency: 'Rs',
    items: [
      { name: 'Buckwheat Tea in Pakistan – 1 LB', sku: 'BAB-BTP-001', quantity: 1, unit_price: 990, subtotal: 990 },
    ],
    shippingAddress: {
      full_name: 'Tahir Islam',
      phone: '+92 312 1007009',
      line1: 'House # 38-A, Street # 3, Mullah Rajputan Seham Road',
      city: 'Rawalpindi',
      country: 'Pakistan',
    },
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 20px', maxWidth: '600px' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '16px 0 8px' }
const h2 = { fontSize: '16px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 12px' }
const sub = { fontSize: '14px', color: '#55575d', margin: '0 0 12px', textAlign: 'center' as const }
const orderBadge = { display: 'inline-block', fontSize: '14px', backgroundColor: '#f3f4f6', padding: '6px 14px', borderRadius: '999px', margin: '4px 0 0', textAlign: 'center' as const }
const card = { border: '1px solid #e5e7eb', borderRadius: '10px', padding: '18px 20px', margin: '0 0 16px' }
const itemRow = { margin: '0' }
const itemName = { fontSize: '14px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 2px' }
const itemMeta = { fontSize: '12px', color: '#6b7280', margin: '0 0 2px' }
const itemPrice = { fontSize: '14px', color: '#0a0a0a', margin: '0' }
const hr = { borderColor: '#e5e7eb', margin: '10px 0' }
const totals = { margin: '4px 0 0' }
const totalRow = { fontSize: '14px', color: '#374151', margin: '4px 0', display: 'flex', justifyContent: 'space-between' as const }
const grandTotal = { fontSize: '16px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '6px 0', display: 'flex', justifyContent: 'space-between' as const }
const addr = { fontSize: '14px', color: '#374151', margin: '0 0 8px', lineHeight: '1.6' }
const link = { color: '#0a7a3b', textDecoration: 'underline' }
const cta = { backgroundColor: '#0a7a3b', color: '#ffffff', fontSize: '14px', borderRadius: '8px', padding: '12px 22px', textDecoration: 'none', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, margin: '20px 0 0', lineHeight: '1.6' }
