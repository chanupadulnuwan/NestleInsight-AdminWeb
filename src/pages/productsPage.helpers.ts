import type { CategoryRecord } from "../api/categories";
import { resolveMediaUrl } from "../api/client";
import type {
  ProductPayload,
  ProductRecord,
  ProductStatus,
} from "../api/products";

export type AdminSection =
  | "dashboard"
  | "approvals"
  | "orders"
  | "stocks";
export type FormMode = "create" | "edit";
export type ProductFilterStatus = "ALL" | ProductStatus;
export type ProductFormField =
  | "productName"
  | "sku"
  | "categoryId"
  | "packSize"
  | "unitPrice"
  | "productsPerCase"
  | "casePrice"
  | "image"
  | "status";

export type ProductFormErrors = Partial<Record<ProductFormField, string>>;

export type ProductFormState = {
  productName: string;
  sku: string;
  categoryId: string;
  brand: string;
  packSize: string;
  unitPrice: string;
  productsPerCase: string;
  casePrice: string;
  isCasePriceManual: boolean;
  barcode: string;
  description: string;
  status: ProductStatus;
  imageFile: File | null;
  imagePreviewUrl: string;
  imageFileName: string;
};

export const surfaceClassName =
  "rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]";

export const navigationItems: Array<{ key: AdminSection; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "approvals", label: "Approvals" },
  { key: "orders", label: "Orders" },
  { key: "stocks", label: "Stocks" },
];

export const brandSuggestions = [
  "Nestle",
  "Milo",
  "Maggi",
  "Nescafe",
  "Milkmaid",
  "Cerelac",
  "Pure Life",
];
export const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
export const imageAcceptValue = ".jpg,.jpeg,.png,.webp,.gif";

export function createEmptyProductForm(): ProductFormState {
  return {
    productName: "",
    sku: "",
    categoryId: "",
    brand: "",
    packSize: "",
    unitPrice: "",
    productsPerCase: "12",
    casePrice: "",
    isCasePriceManual: false,
    barcode: "",
    description: "",
    status: "ACTIVE",
    imageFile: null,
    imagePreviewUrl: "",
    imageFileName: "",
  };
}

export function calculateCasePrice(unitPrice: string, productsPerCase: string) {
  const parsedUnitPrice = Number(unitPrice);
  const parsedProductsPerCase = Number(productsPerCase);

  if (
    !unitPrice.trim() ||
    !productsPerCase.trim() ||
    Number.isNaN(parsedUnitPrice) ||
    Number.isNaN(parsedProductsPerCase) ||
    parsedUnitPrice <= 0 ||
    parsedProductsPerCase < 1
  ) {
    return null;
  }

  return Number((parsedUnitPrice * parsedProductsPerCase).toFixed(2));
}

export function syncAutomaticCasePrice(form: ProductFormState) {
  if (form.isCasePriceManual) {
    return form;
  }

  const calculatedCasePrice = calculateCasePrice(
    form.unitPrice,
    form.productsPerCase,
  );
  return {
    ...form,
    casePrice:
      calculatedCasePrice === null ? "" : calculatedCasePrice.toFixed(2),
  };
}

function isManualCasePrice(product: ProductRecord) {
  const calculatedCasePrice = Number(
    (product.unitPrice * product.productsPerCase).toFixed(2),
  );
  return Math.abs(product.casePrice - calculatedCasePrice) > 0.009;
}

export function productToForm(product: ProductRecord): ProductFormState {
  return {
    productName: product.productName,
    sku: product.sku,
    categoryId: product.categoryId,
    brand: product.brand ?? "",
    packSize: product.packSize,
    unitPrice: product.unitPrice.toFixed(2),
    productsPerCase: product.productsPerCase.toString(),
    casePrice: product.casePrice.toFixed(2),
    isCasePriceManual: isManualCasePrice(product),
    barcode: product.barcode ?? "",
    description: product.description ?? "",
    status: product.status,
    imageFile: null,
    imagePreviewUrl: resolveMediaUrl(product.imageUrl),
    imageFileName: "",
  };
}

export function sortProducts(products: ProductRecord[]) {
  return [...products].sort((left, right) => {
    const categoryCompare = left.categoryName.localeCompare(right.categoryName);
    if (categoryCompare !== 0) return categoryCompare;

    const nameCompare = left.productName.localeCompare(right.productName);
    if (nameCompare !== 0) return nameCompare;

    return left.packSize.localeCompare(right.packSize);
  });
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPortalDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

export function formatStatusLabel(status: ProductStatus) {
  return status === "ACTIVE" ? "Active" : "Inactive";
}

export function formatProductId(productId: string) {
  return productId.slice(0, 8).toUpperCase();
}

export function getProductInitials(product: ProductRecord) {
  return product.productName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read the selected image."));
    };
    reader.onerror = () =>
      reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}

export function validateProductForm(
  form: ProductFormState,
  options: {
    categories: CategoryRecord[];
    products: ProductRecord[];
    mode: FormMode;
    selectedProductId?: string;
  },
) {
  const errors: ProductFormErrors = {};
  const normalizedSku = form.sku.trim().toUpperCase();
  const parsedUnitPrice = Number(form.unitPrice);
  const parsedProductsPerCase = Number(form.productsPerCase);
  const parsedCasePrice = Number(form.casePrice);

  if (!form.productName.trim())
    errors.productName = "Product name is required.";
  if (!normalizedSku) {
    errors.sku = "SKU is required.";
  } else if (
    options.products.some(
      (product) =>
        product.sku.toUpperCase() === normalizedSku &&
        product.id !== options.selectedProductId,
    )
  ) {
    errors.sku = "This SKU already exists.";
  }
  if (!form.categoryId) {
    errors.categoryId = "Select a category.";
  } else if (
    !options.categories.some((category) => category.id === form.categoryId)
  ) {
    errors.categoryId = "Select a valid category.";
  }
  if (!form.packSize.trim())
    errors.packSize = "Pack Size / Variant is required.";
  if (!form.unitPrice.trim()) {
    errors.unitPrice = "Unit Price is required.";
  } else if (Number.isNaN(parsedUnitPrice) || parsedUnitPrice <= 0) {
    errors.unitPrice = "Enter a positive unit price.";
  }
  if (!form.productsPerCase.trim()) {
    errors.productsPerCase = "Products Per Case is required.";
  } else if (
    Number.isNaN(parsedProductsPerCase) ||
    !Number.isInteger(parsedProductsPerCase) ||
    parsedProductsPerCase < 1
  ) {
    errors.productsPerCase = "Products Per Case must be at least 1.";
  }
  if (form.isCasePriceManual) {
    if (!form.casePrice.trim()) {
      errors.casePrice =
        "Enter a case price or switch back to auto-calculation.";
    } else if (Number.isNaN(parsedCasePrice) || parsedCasePrice <= 0) {
      errors.casePrice = "Enter a positive case price.";
    }
  }
  if (!["ACTIVE", "INACTIVE"].includes(form.status))
    errors.status = "Select a valid status.";
  if (
    options.mode === "create" &&
    !form.imageFile &&
    !form.imagePreviewUrl.trim()
  ) {
    errors.image = "Select a product image.";
  }
  if (form.imageFile && !allowedImageTypes.has(form.imageFile.type)) {
    errors.image = "Upload a PNG, JPG, WEBP, or GIF image.";
  }

  return errors;
}

export function toProductPayload(form: ProductFormState): ProductPayload {
  const payload: ProductPayload = {
    productName: form.productName.trim(),
    sku: form.sku.trim().toUpperCase(),
    categoryId: form.categoryId,
    packSize: form.packSize.trim(),
    unitPrice: Number(form.unitPrice),
    productsPerCase: Number(form.productsPerCase),
    status: form.status,
    imageFile: form.imageFile,
  };

  if (form.brand.trim()) payload.brand = form.brand.trim();
  if (form.isCasePriceManual && form.casePrice.trim())
    payload.casePrice = Number(form.casePrice);
  if (form.barcode.trim()) payload.barcode = form.barcode.trim();
  if (form.description.trim()) payload.description = form.description.trim();

  return payload;
}
