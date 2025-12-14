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
            apps: {
                Row: {
                    code: string
                    name: string
                    description: string | null
                    active: boolean | null
                    created_at: string
                }
                Insert: {
                    code: string
                    name: string
                    description?: string | null
                    active?: boolean | null
                    created_at?: string
                }
                Update: {
                    code?: string
                    name?: string
                    description?: string | null
                    active?: boolean | null
                    created_at?: string
                }
                Relationships: []
            }
            permissions: {
                Row: {
                    id: number
                    user_id: string
                    app_code: string
                    role: string | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    user_id: string
                    app_code: string
                    role?: string | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    user_id?: string
                    app_code?: string
                    role?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "permissions_app_code_fkey"
                        columns: ["app_code"]
                        isOneToOne: false
                        referencedRelation: "apps"
                        referencedColumns: ["code"]
                    },
                    {
                        foreignKeyName: "permissions_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    avatar_url: string | null
                    is_super_admin: boolean | null
                    created_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    avatar_url?: string | null
                    is_super_admin?: boolean | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    is_super_admin?: boolean | null
                    created_at?: string
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
            system_settings: {
                Row: {
                    key: string
                    value: string
                    description: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    key: string
                    value: string
                    description?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    key?: string
                    value?: string
                    description?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
