export interface Drink {
  id: string
  category: string
  name: string
  producer: string | null
  region: string | null
  age_years: number | null
  abv: number | null
  price: number | null
  photo_url: string | null
  attributes: Record<string, unknown>
  created_by: string | null
  created_at: string
}

export interface Rating {
  id: string
  drink_id: string
  user_id: string
  nose: number | null
  taste: number | null
  finish: number | null
  overall: number | null
  color_idx: number | null
  wheels: { nose: number[]; taste: number[] }
  note: string | null
  purchase_price: number | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface GlobalDrinkScore {
  id: string
  category: string
  name: string
  producer: string | null
  region: string | null
  photo_url: string | null
  num_ratings: number
  avg_overall: number | null
}

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}
