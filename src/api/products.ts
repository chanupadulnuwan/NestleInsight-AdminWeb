import { apiClient } from "./client";

export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface ProductRecord {
  id: string;
  productName: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  brand: string | null;
  packSize: string;
  unitPrice: number;
  productsPerCase: number;
  casePrice: number;
  barcode: string | null;
  description: string | null;
  imageUrl: string | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPayload {
  productName: string;
  sku: string;
  categoryId: string;
  brand?: string;
  packSize: string;
  unitPrice: number;
  productsPerCase: number;
  casePrice?: number;
  barcode?: string;
  description?: string;
  status: ProductStatus;
  imageFile?: File | null;
}

function toProductFormData(payload: ProductPayload) {
  const formData = new FormData();

  formData.append("productName", payload.productName);
  formData.append("sku", payload.sku);
  formData.append("categoryId", payload.categoryId);
  formData.append("packSize", payload.packSize);
  formData.append("unitPrice", payload.unitPrice.toString());
  formData.append("productsPerCase", payload.productsPerCase.toString());
  formData.append("status", payload.status);

  if (payload.brand) {
    formData.append("brand", payload.brand);
  }

  if (payload.casePrice !== undefined) {
    formData.append("casePrice", payload.casePrice.toString());
  }

  if (payload.barcode) {
    formData.append("barcode", payload.barcode);
  }

  if (payload.description) {
    formData.append("description", payload.description);
  }

  if (payload.imageFile) {
    formData.append("image", payload.imageFile);
  }

  return formData;
}

export async function fetchProducts() {
  const { data } = await apiClient.get<{
    message: string;
    products: ProductRecord[];
  }>("/products");
  return data;
}

export async function checkSkuAvailability(
  sku: string,
  excludeProductId?: string,
) {
  const { data } = await apiClient.get<{
    isAvailable: boolean;
    message: string;
  }>("/products/sku-availability", {
    params: {
      sku,
      excludeProductId,
    },
  });

  return data;
}

export async function createProduct(payload: ProductPayload) {
  const { data } = await apiClient.post<{
    message: string;
    product: ProductRecord;
  }>("/products", toProductFormData(payload));
  return data;
}

export async function updateProduct(
  productId: string,
  payload: ProductPayload,
) {
  const { data } = await apiClient.patch<{
    message: string;
    product: ProductRecord;
  }>(`/products/${productId}`, toProductFormData(payload));
  return data;
}
