import recipesJson from "./recipes.json"

export type Recipe = {
  id: string
  category: string
  title: string
  command: string
  description: string
  explanation: string
  warning?: string
}

export const recipes = recipesJson as Recipe[]

export const recipeCategories = [
  "전체",
  ...Array.from(new Set(recipes.map((recipe) => recipe.category))),
] as const

export type RecipeCategoryFilter = (typeof recipeCategories)[number]
