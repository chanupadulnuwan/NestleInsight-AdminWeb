import { apiClient } from "./client";

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export async function fetchCategories() {
  const { data } = await apiClient.get<{
    message: string;
    categories: CategoryRecord[];
  }>("/categories");
  return data;
}
