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
