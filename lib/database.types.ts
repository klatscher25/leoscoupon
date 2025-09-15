export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      attachments: {
        Row: {
          attachment_type: string
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          linked_id: string | null
          linked_table: string | null
          mime_type: string | null
          owner_user_id: string | null
        }
        Insert: {
          attachment_type: string
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          linked_id?: string | null
          linked_table?: string | null
          mime_type?: string | null
          owner_user_id?: string | null
        }
        Update: {
          attachment_type?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          linked_id?: string | null
          linked_table?: string | null
          mime_type?: string | null
          owner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      cashback_campaigns: {
        Row: {
          brand: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_at: string
          form_url: string | null
          id: string
          is_active: boolean | null
          link_url: string | null
          product_title: string | null
          reward_amount: number
          start_at: string
          tags: string[] | null
          terms: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_at: string
          form_url?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          product_title?: string | null
          reward_amount: number
          start_at?: string
          tags?: string[] | null
          terms?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_at?: string
          form_url?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          product_title?: string | null
          reward_amount?: number
          start_at?: string
          tags?: string[] | null
          terms?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashback_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      cashback_submissions: {
        Row: {
          admin_notes: string | null
          amount: number
          brand: string | null
          campaign_id: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          currency: string | null
          decided_at: string | null
          id: string
          payout_account_id: string | null
          payout_at: string | null
          product_name: string
          purchase_date: string
          reject_reason: string | null
          status: Database["public"]["Enums"]["cashback_status"] | null
          store_id: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          brand?: string | null
          campaign_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency?: string | null
          decided_at?: string | null
          id?: string
          payout_account_id?: string | null
          payout_at?: string | null
          product_name: string
          purchase_date: string
          reject_reason?: string | null
          status?: Database["public"]["Enums"]["cashback_status"] | null
          store_id?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          brand?: string | null
          campaign_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency?: string | null
          decided_at?: string | null
          id?: string
          payout_account_id?: string | null
          payout_at?: string | null
          product_name?: string
          purchase_date?: string
          reject_reason?: string | null
          status?: Database["public"]["Enums"]["cashback_status"] | null
          store_id?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashback_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "cashback_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashback_submissions_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "payout_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashback_submissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashback_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      coupon_redemptions: {
        Row: {
          amount: number | null
          coupon_id: string | null
          created_at: string | null
          id: string
          location: string | null
          notes: string | null
          payback_account_id: string | null
          receipt_image_url: string | null
          redeemed_at: string | null
          redemption_order: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          coupon_id?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          payback_account_id?: string | null
          receipt_image_url?: string | null
          redeemed_at?: string | null
          redemption_order?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          coupon_id?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          payback_account_id?: string | null
          receipt_image_url?: string | null
          redeemed_at?: string | null
          redemption_order?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "redemption_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      coupons: {
        Row: {
          artikel_id: string | null
          barcode_type: Database["public"]["Enums"]["barcode_type"]
          barcode_value: string
          category: Database["public"]["Enums"]["coupon_category"]
          combinable_with_categories: Database["public"]["Enums"]["coupon_category"][] | null
          combination_rules: Json | null
          conditions: string | null
          coupon_value_numeric: number | null
          coupon_value_text: string | null
          coupon_value_type: Database["public"]["Enums"]["coupon_value_type"] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          detected_store_name: string | null
          discount_amount: number | null
          discount_percentage: number | null
          generated_barcode_url: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_combinable: boolean | null
          minimum_purchase_amount: number | null
          per_payback_limit: number | null
          per_user_limit: number | null
          priority: number | null
          product_category_id: string | null
          store_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          valid_from: string
          valid_until: string
          value_amount: number | null
          value_type: string | null
          warengruppe_id: string | null
        }
        Insert: {
          artikel_id?: string | null
          barcode_type: Database["public"]["Enums"]["barcode_type"]
          barcode_value: string
          category?: Database["public"]["Enums"]["coupon_category"]
          combinable_with_categories?: Database["public"]["Enums"]["coupon_category"][] | null
          combination_rules?: Json | null
          conditions?: string | null
          coupon_value_numeric?: number | null
          coupon_value_text?: string | null
          coupon_value_type?: Database["public"]["Enums"]["coupon_value_type"] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          detected_store_name?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          generated_barcode_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_combinable?: boolean | null
          minimum_purchase_amount?: number | null
          per_payback_limit?: number | null
          per_user_limit?: number | null
          priority?: number | null
          product_category_id?: string | null
          store_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          valid_from?: string
          valid_until: string
          value_amount?: number | null
          value_type?: string | null
          warengruppe_id?: string | null
        }
        Update: {
          artikel_id?: string | null
          barcode_type?: Database["public"]["Enums"]["barcode_type"]
          barcode_value?: string
          category?: Database["public"]["Enums"]["coupon_category"]
          combinable_with_categories?: Database["public"]["Enums"]["coupon_category"][] | null
          combination_rules?: Json | null
          conditions?: string | null
          coupon_value_numeric?: number | null
          coupon_value_text?: string | null
          coupon_value_type?: Database["public"]["Enums"]["coupon_value_type"] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          detected_store_name?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          generated_barcode_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_combinable?: boolean | null
          minimum_purchase_amount?: number | null
          per_payback_limit?: number | null
          per_user_limit?: number | null
          priority?: number | null
          product_category_id?: string | null
          store_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          valid_from?: string
          valid_until?: string
          value_amount?: number | null
          value_type?: string | null
          warengruppe_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_product_category_id_fkey"
            columns: ["product_category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          }
        ]
      }
      payout_accounts: {
        Row: {
          account_holder: string | null
          bank_name: string | null
          created_at: string | null
          display_name: string
          iban: string
          id: string
          is_preferred: boolean | null
          user_id: string | null
        }
        Insert: {
          account_holder?: string | null
          bank_name?: string | null
          created_at?: string | null
          display_name: string
          iban: string
          id?: string
          is_preferred?: boolean | null
          user_id?: string | null
        }
        Update: {
          account_holder?: string | null
          bank_name?: string | null
          created_at?: string | null
          display_name?: string
          iban?: string
          id?: string
          is_preferred?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      product_categories: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_category_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          payback_account_id: string | null
          payback_card_code: string | null
          payback_card_scanned_at: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          payback_account_id?: string | null
          payback_card_code?: string | null
          payback_card_scanned_at?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          payback_account_id?: string | null
          payback_card_code?: string | null
          payback_card_scanned_at?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      redemption_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          payback_card_code: string | null
          selected_coupons: string[] | null
          session_status: string | null
          store_id: string | null
          total_value: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          payback_card_code?: string | null
          selected_coupons?: string[] | null
          session_status?: string | null
          store_id?: string | null
          total_value?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          payback_card_code?: string | null
          selected_coupons?: string[] | null
          session_status?: string | null
          store_id?: string | null
          total_value?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redemption_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemption_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      stores: {
        Row: {
          chain_code: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          tags: string[] | null
        }
        Insert: {
          chain_code?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          tags?: string[] | null
        }
        Update: {
          chain_code?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_coupons_by_store_and_category: {
        Args: {
          p_store_id: string
          p_category?: Database["public"]["Enums"]["coupon_category"]
        }
        Returns: {
          id: string
          title: string
          description: string
          category: Database["public"]["Enums"]["coupon_category"]
          value_amount: number
          value_type: string
          valid_until: string
          category_name: string
          can_combine: boolean
          barcode_value: string
          barcode_type: Database["public"]["Enums"]["barcode_type"]
        }[]
      }
      validate_coupon_combination: {
        Args: {
          coupon_ids: string[]
        }
        Returns: Json
      }
    }
    Enums: {
      barcode_type:
        | "ean13"
        | "ean8"
        | "upc_a"
        | "upc_e"
        | "code128"
        | "code39"
        | "qr"
        | "datamatrix"
        | "aztec"
        | "other"
      cashback_status:
        | "entwurf"
        | "eingereicht"
        | "genehmigt"
        | "ausgezahlt"
        | "abgelehnt"
      coupon_category: "einkauf" | "warengruppe" | "artikel"
      coupon_value_type:
        | "multiplier"
        | "euro_amount"
        | "percentage"
        | "buy_x_get_y"
        | "other"
      user_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
