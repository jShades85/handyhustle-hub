export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      catalog_items: {
        Row: {
          category_id: string
          cost: number
          created_at: string
          description: string | null
          has_labor: boolean
          id: string
          image_url: string | null
          is_active: boolean
          labor_hours: number | null
          labor_rate_override: number | null
          manufacturer: string | null
          msrp: number
          name: string
          sku: string | null
          tenant_id: string
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          category_id: string
          cost?: number
          created_at?: string
          description?: string | null
          has_labor?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          labor_hours?: number | null
          labor_rate_override?: number | null
          manufacturer?: string | null
          msrp?: number
          name: string
          sku?: string | null
          tenant_id: string
          unit_of_measure?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          cost?: number
          created_at?: string
          description?: string | null
          has_labor?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          labor_hours?: number | null
          labor_rate_override?: number | null
          manufacturer?: string | null
          msrp?: number
          name?: string
          sku?: string | null
          tenant_id?: string
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
          tenant_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          billing_address: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          phone: string | null
          service_address: string | null
          stage: string
          state: string | null
          tenant_id: string
          website: string | null
        }
        Insert: {
          billing_address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          service_address?: string | null
          stage?: string
          state?: string | null
          tenant_id: string
          website?: string | null
        }
        Update: {
          billing_address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          service_address?: string | null
          stage?: string
          state?: string | null
          tenant_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          assigned_to: string | null
          company_id: string | null
          contact_type: string | null
          created_at: string
          customer_type: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          source: string | null
          stage: string
          tags: string[]
          tenant_id: string
          title: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          company_id?: string | null
          contact_type?: string | null
          created_at?: string
          customer_type?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          tags?: string[]
          tenant_id: string
          title?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          company_id?: string | null
          contact_type?: string | null
          created_at?: string
          customer_type?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          tags?: string[]
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string
          type: Database["public"]["Enums"]["location_type"]
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id: string
          type?: Database["public"]["Enums"]["location_type"]
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
          type?: Database["public"]["Enums"]["location_type"]
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_locations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          qty: number
          sort_order: number
          total: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          qty?: number
          sort_order?: number
          total?: number
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          qty?: number
          sort_order?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          invoice_id: string
          method: string
          reference: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          id?: string
          invoice_id: string
          method: string
          reference?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          invoice_id?: string
          method?: string
          reference?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          balance_due: number
          company_id: string | null
          company_name: string
          contact_id: string | null
          contact_name: string
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          issued_date: string
          linked_project_id: string | null
          linked_work_order_id: string | null
          notes: string
          payment_terms: string
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          tenant_id: string
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          balance_due?: number
          company_id?: string | null
          company_name?: string
          contact_id?: string | null
          contact_name?: string
          created_at?: string
          due_date: string
          id?: string
          invoice_number: string
          issued_date: string
          linked_project_id?: string | null
          linked_work_order_id?: string | null
          notes?: string
          payment_terms?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          tenant_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance_due?: number
          company_id?: string | null
          company_name?: string
          contact_id?: string | null
          contact_name?: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          issued_date?: string
          linked_project_id?: string | null
          linked_work_order_id?: string | null
          notes?: string
          payment_terms?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_linked_work_order_id_fkey"
            columns: ["linked_work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          company_name: string | null
          converted_at: string | null
          converted_contact_id: string | null
          converted_opportunity_id: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          location: string | null
          notes: string | null
          phone: string | null
          service_interest: string | null
          source: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          assigned_to?: string | null
          company_name?: string | null
          converted_at?: string | null
          converted_contact_id?: string | null
          converted_opportunity_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          service_interest?: string | null
          source?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          assigned_to?: string | null
          company_name?: string | null
          converted_at?: string | null
          converted_contact_id?: string | null
          converted_opportunity_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          service_interest?: string | null
          source?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_contact_id_fkey"
            columns: ["converted_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_opportunity_id_fkey"
            columns: ["converted_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          assigned_to: string | null
          close_date: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          id: string
          notes: string | null
          priority: string
          source: string | null
          stage: string
          tenant_id: string
          title: string
          value: number | null
        }
        Insert: {
          assigned_to?: string | null
          close_date?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string
          source?: string | null
          stage?: string
          tenant_id: string
          title: string
          value?: number | null
        }
        Update: {
          assigned_to?: string | null
          close_date?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          priority?: string
          source?: string | null
          stage?: string
          tenant_id?: string
          title?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      po_line_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string
          description: string
          id: string
          po_id: string
          qty_ordered: number
          qty_received: number
          sku: string
          sort_order: number
          tenant_id: string
          unit_cost: number
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string
          description: string
          id?: string
          po_id: string
          qty_ordered?: number
          qty_received?: number
          sku?: string
          sort_order?: number
          tenant_id: string
          unit_cost?: number
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string
          description?: string
          id?: string
          po_id?: string
          qty_ordered?: number
          qty_received?: number
          sku?: string
          sort_order?: number
          tenant_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "po_line_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_line_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budgeted_cost: number | null
          budgeted_hours: number | null
          code: string | null
          company_id: string | null
          contact_id: string | null
          contract_value: number | null
          created_at: string
          id: string
          name: string
          notes: string | null
          opportunity_id: string | null
          pm_id: string | null
          site_address: string | null
          start_date: string | null
          status: string
          target_end_date: string | null
          tenant_id: string
        }
        Insert: {
          budgeted_cost?: number | null
          budgeted_hours?: number | null
          code?: string | null
          company_id?: string | null
          contact_id?: string | null
          contract_value?: number | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          opportunity_id?: string | null
          pm_id?: string | null
          site_address?: string | null
          start_date?: string | null
          status?: string
          target_end_date?: string | null
          tenant_id: string
        }
        Update: {
          budgeted_cost?: number | null
          budgeted_hours?: number | null
          code?: string | null
          company_id?: string | null
          contact_id?: string | null
          contract_value?: number | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          opportunity_id?: string | null
          pm_id?: string | null
          site_address?: string | null
          start_date?: string | null
          status?: string
          target_end_date?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_pm_id_fkey"
            columns: ["pm_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          expected_date: string | null
          id: string
          linked_project_id: string | null
          linked_work_order_id: string | null
          notes: string
          order_date: string
          po_number: string
          received_date: string | null
          status: string
          tenant_id: string
          tracking_number: string | null
          updated_at: string
          vendor_id: string
          vendor_order_number: string | null
        }
        Insert: {
          created_at?: string
          expected_date?: string | null
          id?: string
          linked_project_id?: string | null
          linked_work_order_id?: string | null
          notes?: string
          order_date: string
          po_number: string
          received_date?: string | null
          status?: string
          tenant_id: string
          tracking_number?: string | null
          updated_at?: string
          vendor_id: string
          vendor_order_number?: string | null
        }
        Update: {
          created_at?: string
          expected_date?: string | null
          id?: string
          linked_project_id?: string | null
          linked_work_order_id?: string | null
          notes?: string
          order_date?: string
          po_number?: string
          received_date?: string | null
          status?: string
          tenant_id?: string
          tracking_number?: string | null
          updated_at?: string
          vendor_id?: string
          vendor_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_linked_work_order_id_fkey"
            columns: ["linked_work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_write: boolean
          id: string
          module: Database["public"]["Enums"]["app_module"]
          role_id: string
        }
        Insert: {
          can_write?: boolean
          id?: string
          module: Database["public"]["Enums"]["app_module"]
          role_id: string
        }
        Update: {
          can_write?: boolean
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          color: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          tenant_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_plans: {
        Row: {
          account_manager_id: string | null
          activity: Json
          billing_cycle: string
          code: string
          company_id: string | null
          contact_id: string | null
          contact_name: string
          covered_systems: string[]
          created_at: string
          customer_name: string
          id: string
          mrr: number
          notes: string
          phone: string
          renewal_date: string | null
          site_address: string
          sla_response: string
          start_date: string | null
          status: string
          tenant_id: string
          tier: string
          updated_at: string
          visits_per_year: number
          visits_used: number
        }
        Insert: {
          account_manager_id?: string | null
          activity?: Json
          billing_cycle?: string
          code: string
          company_id?: string | null
          contact_id?: string | null
          contact_name?: string
          covered_systems?: string[]
          created_at?: string
          customer_name: string
          id?: string
          mrr?: number
          notes?: string
          phone?: string
          renewal_date?: string | null
          site_address?: string
          sla_response?: string
          start_date?: string | null
          status?: string
          tenant_id: string
          tier?: string
          updated_at?: string
          visits_per_year?: number
          visits_used?: number
        }
        Update: {
          account_manager_id?: string | null
          activity?: Json
          billing_cycle?: string
          code?: string
          company_id?: string | null
          contact_id?: string | null
          contact_name?: string
          covered_systems?: string[]
          created_at?: string
          customer_name?: string
          id?: string
          mrr?: number
          notes?: string
          phone?: string
          renewal_date?: string | null
          site_address?: string
          sla_response?: string
          start_date?: string | null
          status?: string
          tenant_id?: string
          tier?: string
          updated_at?: string
          visits_per_year?: number
          visits_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_plans_account_manager_id_fkey"
            columns: ["account_manager_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plans_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          code: string | null
          company_id: string | null
          contact_id: string | null
          contact_name: string | null
          created_at: string
          customer_name: string | null
          due_date: string | null
          id: string
          issue: string
          notes: string | null
          on_service_plan: boolean
          phone: string | null
          priority: string
          site_address: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          code?: string | null
          company_id?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          customer_name?: string | null
          due_date?: string | null
          id?: string
          issue: string
          notes?: string | null
          on_service_plan?: boolean
          phone?: string | null
          priority?: string
          site_address?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          code?: string | null
          company_id?: string | null
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          customer_name?: string | null
          due_date?: string | null
          id?: string
          issue?: string
          notes?: string | null
          on_service_plan?: boolean
          phone?: string | null
          priority?: string
          site_address?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          catalog_item_id: string | null
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          location_bin: string
          manufacturer_name: string
          max_stock_level: number
          min_stock_level: number
          name: string
          qty_on_hand: number
          sku: string
          tenant_id: string
          unit_cost: number
          unit_of_measure: string
          updated_at: string
        }
        Insert: {
          catalog_item_id?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_bin?: string
          manufacturer_name?: string
          max_stock_level?: number
          min_stock_level?: number
          name: string
          qty_on_hand?: number
          sku?: string
          tenant_id: string
          unit_cost?: number
          unit_of_measure?: string
          updated_at?: string
        }
        Update: {
          catalog_item_id?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_bin?: string
          manufacturer_name?: string
          max_stock_level?: number
          min_stock_level?: number
          name?: string
          qty_on_hand?: number
          sku?: string
          tenant_id?: string
          unit_cost?: number
          unit_of_measure?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          job_reference: string | null
          note: string | null
          qty_delta: number
          stock_item_id: string
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          job_reference?: string | null
          note?: string | null
          qty_delta: number
          stock_item_id: string
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          job_reference?: string | null
          note?: string | null
          qty_delta?: number
          stock_item_id?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          default_payment_terms: string | null
          default_tax_rate: number | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          slug: string | null
          state: string | null
          tagline: string | null
          timezone: string
          trade_type: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          default_payment_terms?: string | null
          default_tax_rate?: number | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          slug?: string | null
          state?: string | null
          tagline?: string | null
          timezone?: string
          trade_type?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          default_payment_terms?: string | null
          default_tax_rate?: number | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string | null
          state?: string | null
          tagline?: string | null
          timezone?: string
          trade_type?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          availability: string
          certifications: string[]
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          pay_rate: number
          pay_type: string
          phone: string | null
          role_id: string | null
          skills: string[]
          start_date: string | null
          tenant_id: string
          vehicle_id: string | null
        }
        Insert: {
          availability?: string
          certifications?: string[]
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          pay_rate?: number
          pay_type?: string
          phone?: string | null
          role_id?: string | null
          skills?: string[]
          start_date?: string | null
          tenant_id: string
          vehicle_id?: string | null
        }
        Update: {
          availability?: string
          certifications?: string[]
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          pay_rate?: number
          pay_type?: string
          phone?: string | null
          role_id?: string | null
          skills?: string[]
          start_date?: string | null
          tenant_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          id: string
          license_plate: string | null
          make: string | null
          model: string | null
          name: string
          tenant_id: string
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name: string
          tenant_id: string
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
          tenant_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          account_number: string | null
          category: string
          city: string
          created_at: string
          email: string
          id: string
          name: string
          notes: string
          payment_terms: string
          phone: string
          rep_email: string | null
          rep_name: string | null
          rep_phone: string | null
          state: string
          status: string
          tenant_id: string
          updated_at: string
          website: string
        }
        Insert: {
          account_number?: string | null
          category?: string
          city?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          notes?: string
          payment_terms?: string
          phone?: string
          rep_email?: string | null
          rep_name?: string | null
          rep_phone?: string | null
          state?: string
          status?: string
          tenant_id: string
          updated_at?: string
          website?: string
        }
        Update: {
          account_number?: string | null
          category?: string
          city?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string
          payment_terms?: string
          phone?: string
          rep_email?: string | null
          rep_name?: string | null
          rep_phone?: string | null
          state?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          assigned_to: string | null
          budgeted_cost: number | null
          budgeted_hours: number | null
          code: string | null
          company_id: string | null
          contact_id: string | null
          contract_value: number | null
          created_at: string
          id: string
          name: string
          notes: string | null
          opportunity_id: string | null
          project_id: string | null
          scheduled_date: string | null
          site_address: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          assigned_to?: string | null
          budgeted_cost?: number | null
          budgeted_hours?: number | null
          code?: string | null
          company_id?: string | null
          contact_id?: string | null
          contract_value?: number | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          opportunity_id?: string | null
          project_id?: string | null
          scheduled_date?: string | null
          site_address?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          assigned_to?: string | null
          budgeted_cost?: number | null
          budgeted_hours?: number | null
          code?: string | null
          company_id?: string | null
          contact_id?: string | null
          contract_value?: number | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          opportunity_id?: string | null
          project_id?: string | null
          scheduled_date?: string | null
          site_address?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_tenant_id: { Args: never; Returns: string }
      deactivate_member: { Args: { p_id: string }; Returns: undefined }
      get_inactive_members: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role_id: string
          tenant_id: string
          vehicle_id: string
        }[]
      }
      get_tenant_by_slug: {
        Args: { p_slug: string }
        Returns: {
          id: string
          name: string
          slug: string
        }[]
      }
      reactivate_member: { Args: { p_id: string }; Returns: undefined }
      seed_default_roles: { Args: { p_tenant_id: string }; Returns: undefined }
    }
    Enums: {
      app_module:
        | "crm"
        | "sales"
        | "finance"
        | "operations"
        | "service"
        | "inventory"
        | "reports"
        | "settings"
      location_type: "warehouse" | "vehicle" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_module: [
        "crm",
        "sales",
        "finance",
        "operations",
        "service",
        "inventory",
        "reports",
        "settings",
      ],
      location_type: ["warehouse", "vehicle", "other"],
    },
  },
} as const
