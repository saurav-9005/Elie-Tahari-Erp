export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = 'admin' | 'finance' | 'warehouse' | 'viewer';
export type ProfileStatus = 'pending' | 'active' | 'disabled';
export type ShopifyEventStatus = 'pending' | 'processed' | 'failed';
export type InviteStatus = 'sent' | 'accepted' | 'expired';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: AppRole;
          status: ProfileStatus;
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: AppRole;
          status?: ProfileStatus;
          invited_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      shopify_events: {
        Row: {
          id: string;
          shopify_webhook_id: string | null;
          event_type: string;
          raw_payload: Json;
          status: ShopifyEventStatus;
          retry_count: number;
          error_message: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          shopify_webhook_id?: string | null;
          event_type: string;
          raw_payload: Json;
          status?: ShopifyEventStatus;
          retry_count?: number;
          error_message?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['shopify_events']['Insert']>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          shopify_order_id: string;
          customer_email: string | null;
          customer_name: string | null;
          total_price: number | null;
          currency: string;
          status: string;
          fulfillment_status: string | null;
          line_items: Json | null;
          shipping_address: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shopify_order_id: string;
          customer_email?: string | null;
          customer_name?: string | null;
          total_price?: number | null;
          currency?: string;
          status?: string;
          fulfillment_status?: string | null;
          line_items?: Json | null;
          shipping_address?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
        Relationships: [];
      };
      inventory: {
        Row: {
          id: string;
          shopify_product_id: string;
          shopify_variant_id: string | null;
          title: string;
          sku: string | null;
          quantity: number;
          last_synced_at: string;
          product_created_at: string | null;
          product_type: string | null;
          vendor: string | null;
          product_status: string | null;
        };
        Insert: {
          id?: string;
          shopify_product_id: string;
          shopify_variant_id?: string | null;
          title: string;
          sku?: string | null;
          quantity?: number;
          last_synced_at?: string;
          product_created_at?: string | null;
          product_type?: string | null;
          vendor?: string | null;
          product_status?: string | null;
        };
        Update: Partial<Database['public']['Tables']['inventory']['Insert']>;
        Relationships: [];
      };
      inventory_report_cache: {
        Row: {
          id: string;
          title: string;
          sku: string | null;
          product_type: string | null;
          vendor: string | null;
          current_stock: number;
          qty_before_july: number;
          gross_before_july: number;
          net_before_july: number;
          discount_before_july: number;
          qty_after_july: number;
          gross_after_july: number;
          net_after_july: number;
          discount_after_july: number;
          total_qty: number;
          total_gross: number;
          total_net: number;
          total_discount: number;
          refreshed_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          sku?: string | null;
          product_type?: string | null;
          vendor?: string | null;
          current_stock?: number;
          qty_before_july?: number;
          gross_before_july?: number;
          net_before_july?: number;
          discount_before_july?: number;
          qty_after_july?: number;
          gross_after_july?: number;
          net_after_july?: number;
          discount_after_july?: number;
          total_qty?: number;
          total_gross?: number;
          total_net?: number;
          total_discount?: number;
          refreshed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['inventory_report_cache']['Insert']>;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          shopify_customer_id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          total_orders: number;
          total_spent: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          shopify_customer_id: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          total_orders?: number;
          total_spent?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
        Relationships: [];
      };
      invite_log: {
        Row: {
          id: string;
          email: string;
          role: string;
          sent_by: string | null;
          sent_at: string;
          accepted_at: string | null;
          status: InviteStatus;
        };
        Insert: {
          id?: string;
          email: string;
          role: string;
          sent_by?: string | null;
          sent_at?: string;
          accepted_at?: string | null;
          status?: InviteStatus;
        };
        Update: Partial<Database['public']['Tables']['invite_log']['Insert']>;
        Relationships: [];
      };
      sync_logs: {
        Row: {
          id: string;
          event_id: string | null;
          action: string | null;
          success: boolean | null;
          error_message: string | null;
          synced_at: string;
        };
        Insert: {
          id?: string;
          event_id?: string | null;
          action?: string | null;
          success?: boolean | null;
          error_message?: string | null;
          synced_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sync_logs']['Insert']>;
        Relationships: [];
      };
      ceo_alerts: {
        Row: {
          id: string;
          type: string;
          severity: 'critical' | 'warning' | 'healthy';
          title: string;
          body: string;
          value: number | null;
          threshold: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          severity: 'critical' | 'warning' | 'healthy';
          title: string;
          body: string;
          value?: number | null;
          threshold?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ceo_alerts']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      erp_intelligence_geo_by_state: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_intelligence_geo_top_cities: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_intelligence_product_top_week: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_intelligence_product_trending: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_intelligence_product_never_discounted: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_intelligence_customer_segments: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_intelligence_customer_avg_by_segment: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_intelligence_customer_new_returning: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_intelligence_customer_returning_trend: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_intelligence_behavior_hours: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_intelligence_behavior_summary: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_ceo_generate_alerts: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_ceo_growth_snapshot: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_ceo_revenue_trend: {
        Args: { p_days?: number };
        Returns: Json;
      };
      erp_ceo_stock_risk: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_ceo_pareto_skus: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_ceo_sell_through: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_inventory_report_pre_july: {
        Args: { p_page?: number; p_page_size?: number };
        Returns: Json;
      };
      erp_inventory_report_summary: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_inventory_export_csv: {
        Args: Record<string, never>;
        Returns: string;
      };
      erp_inventory_dashboard_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      erp_inventory_top_sellers: {
        Args: { p_page?: number };
        Returns: Json;
      };
      erp_inventory_stock_alerts: {
        Args: { p_page?: number };
        Returns: Json;
      };
      erp_wms_inventory: {
        Args: { p_page?: number };
        Returns: Json;
      };
      erp_shopify_inventory: {
        Args: { p_page?: number };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
