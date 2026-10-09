// utils/orderPricing.ts

export function lineTotal(order: any): number {
  const price = Number(order?.price) || 0
  const qty = Number(order?.quantity) || 0
  return Math.round(price * qty * 100) / 100
}

export function formatMoney(amount: number, currency?: string): string {
  const text = amount.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${text} ${currency || "TL"}`
}

// Para birimine göre ayrı ayrı genel toplam
export function totalsByCurrency(orders: any[]) {
  const totals: Record<string, number> = {}
  let unpriced = 0

  for (const o of orders) {
    if (o.status === "REDDEDILDI") continue
    if (!(Number(o.price) > 0)) { unpriced++; continue }
    const cur = o.currency || "TL"
    totals[cur] = Math.round(((totals[cur] || 0) + lineTotal(o)) * 100) / 100
  }
  return { totals, unpriced }
}