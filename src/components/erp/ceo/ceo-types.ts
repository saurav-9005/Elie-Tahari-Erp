export type CeoAlertSeverity = 'critical' | 'warning' | 'healthy';

export type CeoAlert = {
  type: string;
  severity: CeoAlertSeverity;
  title: string;
  body: string;
  value: number;
  threshold: number;
};

export type GrowthSnapshotData = {
  revenue_today: number;
  revenue_mtd: number;
  revenue_last_month: number;
  revenue_ytd: number;
  orders_today: number;
  orders_mtd: number;
  aov_mtd: number;
  aov_last_month: number;
  repeat_rate: number;
  new_customers_mtd: number;
};

export type RevenueTrendPoint = {
  date: string;
  revenue: number;
  orders: number;
  aov: number;
};

export type StockRiskRow = {
  title: string;
  sku: string | null;
  stock: number;
  daily_velocity: number;
  days_remaining: number | null;
  status: CeoAlertSeverity | 'healthy';
};

export type ParetoRow = {
  product: string;
  revenue: number;
  units: number;
  pct_of_revenue: number;
  cumulative_pct: number;
};

export type SellThroughRow = {
  title: string;
  sku: string | null;
  units_sold: number;
  current_stock: number;
  sell_through: number;
  category: 'dead_stock' | 'fast_seller' | 'slow_mover' | 'normal';
};
