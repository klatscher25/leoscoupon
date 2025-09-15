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
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          linked_id: string | null
          linked_table: string | null
          mime_type: string | null
          owner_user_id: string
        }
        Insert: {
          attachment_type: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          linked_id?: string | null
          linked_table?: string | null
          mime_type?: string | null
          owner_user_id: string
        }
        Update: {
          attachment_type?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          linked_id?: string | null
          linked_table?: string | null
          mime_type?: string | null
          owner_user_id?: string
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
          created_at: string
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
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
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
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
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
          updated_at?: string
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
          created_at: string
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
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          brand?: string | null
          campaign_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
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
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          brand?: string | null
          campaign_id?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
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
          updated_at?: string
          user_id?: string
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
          coupon_id: string
          created_at: string
          id: string
          location: string | null
          notes: string | null
          payback_account_id: string | null
          receipt_image_url: string | null
          redeemed_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          coupon_id: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          payback_account_id?: string | null
          receipt_image_url?: string | null
          redeemed_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          coupon_id?: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          payback_account_id?: string | null
          receipt_image_url?: string | null
          redeemed_at?: string
          user_id?: string
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
          barcode_type: Database["public"]["Enums"]["barcode_type"]
          barcode_value: string
          category: Database["public"]["Enums"]["coupon_category"]
          combinable_with_categories: Database["public"]["Enums"]["coupon_category"][] | null
          conditions: string | null
          created_at: string
          created_by: string | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_combinable: boolean | null
          minimum_purchase_amount: number | null
          per_payback_limit: number | null
          per_user_limit: number | null
          priority: number | null
          store_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          barcode_type: Database["public"]["Enums"]["barcode_type"]
          barcode_value: string
          category?: Database["public"]["Enums"]["coupon_category"]
          combinable_with_categories?: Database["public"]["Enums"]["coupon_category"][] | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_combinable?: boolean | null
          minimum_purchase_amount?: number | null
          per_payback_limit?: number | null
          per_user_limit?: number | null
          priority?: number | null
          store_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          barcode_type?: Database["public"]["Enums"]["barcode_type"]
          barcode_value?: string
          category?: Database["public"]["Enums"]["coupon_category"]
          combinable_with_categories?: Database["public"]["Enums"]["coupon_category"][] | null
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_combinable?: boolean | null
          minimum_purchase_amount?: number | null
          per_payback_limit?: number | null
          per_user_limit?: number | null
          priority?: number | null
          store_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string
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
          created_at: string
          display_name: string
          iban: string
          id: string
          is_preferred: boolean | null
          user_id: string
        }
        Insert: {
          account_holder?: string | null
          bank_name?: string | null
          created_at?: string
          display_name: string
          iban: string
          id?: string
          is_preferred?: boolean | null
          user_id: string
        }
        Update: {
          account_holder?: string | null
          bank_name?: string | null
          created_at?: string
          display_name?: string
          iban?: string
          id?: string
          is_preferred?: boolean | null
          user_id?: string
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
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          payback_account_id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          payback_account_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          payback_account_id?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string
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
      stores: {
        Row: {
          chain_code: string | null
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          tags: string[] | null
        }
        Insert: {
          chain_code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          tags?: string[] | null
        }
        Update: {
          chain_code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
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
      [_ in never]: never
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
      user_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
