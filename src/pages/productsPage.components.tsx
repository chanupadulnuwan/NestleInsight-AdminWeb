import type { ChangeEvent, ReactNode, RefObject } from "react";
import type { CategoryRecord } from "../api/categories";
import type {
  AdminSection,
  FormMode,
  ProductFormErrors,
  ProductFormState,
} from "./productsPage.helpers";
import { calculateCasePrice, formatCurrency } from "./productsPage.helpers";

const inputClassName = (hasError = false) =>
  `mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267] focus:ring-2 focus:ring-[#f1dac9] ${
    hasError ? "border-[#e1aaa3] bg-[#fff7f6]" : "border-[#e5d3c6] bg-[#fffdfb]"
  }`;

function FieldShell({
  label,
  htmlFor,
  required = false,
  helper,
  error,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  helper?: string | null;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]"
      >
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {error ? (
        <p className="mt-2 text-xs text-[#b7625e]">{error}</p>
      ) : helper ? (
        <p className="mt-2 text-xs leading-5 text-[#8a6c58]">{helper}</p>
      ) : null}
    </div>
  );
}

export function NavGlyph({ name }: { name: AdminSection }) {
  if (name === "dashboard") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="10.5" width="7" height="10" rx="1.5" />
      </svg>
    );
  }

  if (name === "approvals") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M8 4.5h8" />
        <path d="M8.5 3.5h7a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
        <path d="m9 12 2.1 2.2L15.5 10" />
      </svg>
    );
  }

  if (name === "orders") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6.5 7.5h11l-1 10h-9Z" />
        <path d="M9 7.5a3 3 0 0 1 6 0" />
        <path d="M8 12h8" />
      </svg>
    );
  }

  if (name === "stocks") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m4 8 8-4 8 4-8 4Z" />
        <path d="m4 12 8 4 8-4" />
        <path d="m4 16 8 4 8-4" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.5v2.1" />
      <path d="M12 18.4v2.1" />
      <path d="m5.9 5.9 1.5 1.5" />
      <path d="m16.6 16.6 1.5 1.5" />
      <path d="M3.5 12h2.1" />
      <path d="M18.4 12h2.1" />
      <path d="m5.9 18.1 1.5-1.5" />
      <path d="m16.6 7.4 1.5-1.5" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export function ProductFormFields({
  mode,
  form,
  errors,
  categories,
  isCheckingSku,
  onFieldChange,
  onSkuBlur,
  onCasePriceModeChange,
  gridClassName,
}: {
  mode: FormMode;
  form: ProductFormState;
  errors: ProductFormErrors;
  categories: CategoryRecord[];
  isCheckingSku: boolean;
  onFieldChange: (
    mode: FormMode,
    field: keyof ProductFormState,
    value: string,
  ) => void;
  onSkuBlur: (mode: FormMode) => void;
  onCasePriceModeChange: (mode: FormMode, manual: boolean) => void;
  gridClassName: string;
}) {
  const calculatedCasePrice = calculateCasePrice(
    form.unitPrice,
    form.productsPerCase,
  );
  const descriptionClassName = gridClassName.includes("xl:grid-cols-3")
    ? "md:col-span-2 xl:col-span-3"
    : "md:col-span-2";

  return (
    <div className={gridClassName}>
      <FieldShell
        label="Product Name"
        htmlFor={`${mode}-product-name`}
        required
        error={errors.productName}
      >
        <input
          id={`${mode}-product-name`}
          value={form.productName}
          onChange={(event) =>
            onFieldChange(mode, "productName", event.target.value)
          }
          placeholder="e.g. Milo"
          className={inputClassName(Boolean(errors.productName))}
        />
      </FieldShell>
      <FieldShell
        label="SKU"
        htmlFor={`${mode}-sku`}
        required
        error={errors.sku}
        helper={
          isCheckingSku
            ? "Checking SKU availability..."
            : "Unique business code used for product lookup."
        }
      >
        <input
          id={`${mode}-sku`}
          value={form.sku}
          onChange={(event) =>
            onFieldChange(mode, "sku", event.target.value.toUpperCase())
          }
          onBlur={() => void onSkuBlur(mode)}
          placeholder="e.g. MILO-400G"
          className={inputClassName(Boolean(errors.sku))}
        />
      </FieldShell>
      <FieldShell
        label="Category"
        htmlFor={`${mode}-category`}
        required
        error={errors.categoryId}
      >
        <select
          id={`${mode}-category`}
          value={form.categoryId}
          onChange={(event) =>
            onFieldChange(mode, "categoryId", event.target.value)
          }
          className={inputClassName(Boolean(errors.categoryId))}
        >
          <option value="">Select category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </FieldShell>
      <FieldShell
        label="Brand"
        htmlFor={`${mode}-brand`}
        helper="Optional. Nestle-related examples are available for quick entry."
      >
        <input
          id={`${mode}-brand`}
          list="brand-list"
          value={form.brand}
          onChange={(event) => onFieldChange(mode, "brand", event.target.value)}
          placeholder="e.g. Nestle"
          className={inputClassName()}
        />
      </FieldShell>
      <FieldShell
        label="Pack Size / Variant"
        htmlFor={`${mode}-pack-size`}
        required
        error={errors.packSize}
      >
        <input
          id={`${mode}-pack-size`}
          value={form.packSize}
          onChange={(event) =>
            onFieldChange(mode, "packSize", event.target.value)
          }
          placeholder="e.g. 400g"
          className={inputClassName(Boolean(errors.packSize))}
        />
      </FieldShell>
      <FieldShell
        label="Unit Price"
        htmlFor={`${mode}-unit-price`}
        required
        error={errors.unitPrice}
      >
        <input
          id={`${mode}-unit-price`}
          type="number"
          min="0"
          step="0.01"
          value={form.unitPrice}
          onChange={(event) =>
            onFieldChange(mode, "unitPrice", event.target.value)
          }
          placeholder="e.g. 120.00"
          className={inputClassName(Boolean(errors.unitPrice))}
        />
      </FieldShell>
      <FieldShell
        label="Products Per Case"
        htmlFor={`${mode}-products-per-case`}
        required
        error={errors.productsPerCase}
      >
        <input
          id={`${mode}-products-per-case`}
          type="number"
          min="1"
          step="1"
          value={form.productsPerCase}
          onChange={(event) =>
            onFieldChange(mode, "productsPerCase", event.target.value)
          }
          placeholder="e.g. 12"
          className={inputClassName(Boolean(errors.productsPerCase))}
        />
      </FieldShell>
      <div>
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor={`${mode}-case-price`}
            className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]"
          >
            Case Price
          </label>
          <button
            type="button"
            onClick={() => onCasePriceModeChange(mode, !form.isCasePriceManual)}
            className="text-xs font-semibold text-[#8b5a3a] transition duration-300 hover:text-[#6f452d]"
          >
            {form.isCasePriceManual ? "Manual override on" : "Auto-calculated"}
          </button>
        </div>
        <input
          id={`${mode}-case-price`}
          type="number"
          min="0"
          step="0.01"
          value={form.casePrice}
          onChange={(event) =>
            onFieldChange(mode, "casePrice", event.target.value)
          }
          placeholder="e.g. 1440.00"
          disabled={!form.isCasePriceManual}
          className={`${inputClassName(Boolean(errors.casePrice))} ${form.isCasePriceManual ? "" : "cursor-not-allowed opacity-75"}`}
        />
        {errors.casePrice ? (
          <p className="mt-2 text-xs text-[#b7625e]">{errors.casePrice}</p>
        ) : (
          <p className="mt-2 text-xs leading-5 text-[#8a6c58]">
            {form.isCasePriceManual
              ? "Manual override is enabled for this product."
              : calculatedCasePrice === null
                ? "Case price will be calculated from Unit Price x Products Per Case."
                : `Auto-calculated: ${formatCurrency(calculatedCasePrice)}`}
          </p>
        )}
      </div>
      <FieldShell
        label="Status"
        htmlFor={`${mode}-status`}
        error={errors.status}
      >
        <select
          id={`${mode}-status`}
          value={form.status}
          onChange={(event) =>
            onFieldChange(mode, "status", event.target.value)
          }
          className={inputClassName(Boolean(errors.status))}
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </FieldShell>
      <FieldShell
        label="Barcode"
        htmlFor={`${mode}-barcode`}
        helper="Optional. Separate from the SKU."
      >
        <input
          id={`${mode}-barcode`}
          value={form.barcode}
          onChange={(event) =>
            onFieldChange(mode, "barcode", event.target.value)
          }
          placeholder="e.g. 4792004000012"
          className={inputClassName()}
        />
      </FieldShell>
      <div className={descriptionClassName}>
        <label
          htmlFor={`${mode}-description`}
          className="block text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[#8a6c58]"
        >
          Description
        </label>
        <textarea
          id={`${mode}-description`}
          value={form.description}
          onChange={(event) =>
            onFieldChange(mode, "description", event.target.value)
          }
          placeholder="Add a short product description"
          rows={5}
          className={`${inputClassName()} min-h-[9.5rem] max-w-none resize-y leading-6`}
        />
        <p className="mt-2 text-xs leading-5 text-[#8a6c58]">
          Optional. Use this for retail notes or short product context.
        </p>
      </div>
    </div>
  );
}

export function ProductImagePanels({
  mode,
  form,
  error,
  title,
  previewTitle,
  helperText,
  inputRef,
  onImageSelection,
  onRemoveImage,
  imageAcceptValue,
}: {
  mode: FormMode;
  form: ProductFormState;
  error?: string;
  title: string;
  previewTitle: string;
  helperText: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onImageSelection: (
    event: ChangeEvent<HTMLInputElement>,
    mode: FormMode,
  ) => Promise<void>;
  onRemoveImage: (mode: FormMode) => void;
  imageAcceptValue: string;
}) {
  const hasImageSelection = Boolean(form.imageFile || form.imagePreviewUrl);

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[1.35rem] border border-[#ead8ca] bg-[#fff9f5] px-4 py-4">
        <p className="text-sm font-semibold text-[#5d4031]">{title}</p>
        <label
          htmlFor={`${mode}-image-upload`}
          className="group mt-4 flex cursor-pointer flex-col rounded-[1.2rem] border border-dashed border-[#d9bfab] bg-[#fffdfb] px-4 py-4 transition duration-300 hover:border-[#c9976f] hover:bg-[#fff6ee] focus-within:border-[#c9976f] focus-within:bg-[#fff6ee]"
        >
          <input
            ref={inputRef}
            id={`${mode}-image-upload`}
            type="file"
            accept={imageAcceptValue}
            onChange={(event) => void onImageSelection(event, mode)}
            className="sr-only"
          />
          <span className="text-sm font-semibold text-[#5d4031]">
            Choose product image
          </span>
          <span className="mt-2 text-xs leading-5 text-[#8a6c58]">
            {form.imageFileName
              ? `Selected file: ${form.imageFileName}`
              : "PNG, JPG, WEBP, or GIF up to 5MB"}
          </span>
          <span className="mt-4 inline-flex w-fit rounded-full border border-[#dcc1ab] bg-white px-3 py-2 text-xs font-semibold text-[#6e4d3b] transition duration-300 group-hover:border-[#c9976f] group-hover:text-[#4d3020]">
            Browse files
          </span>
        </label>
        {error ? (
          <p className="mt-3 text-xs text-[#b7625e]">{error}</p>
        ) : (
          <p className="mt-3 text-xs leading-6 text-[#8a6c58]">{helperText}</p>
        )}
        {hasImageSelection ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onRemoveImage(mode)}
              className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
            >
              Remove image
            </button>
          </div>
        ) : null}
      </div>
      <div className="rounded-[1.35rem] border border-[#ead8ca] bg-[#fffdfb] p-4">
        <p className="text-sm font-semibold text-[#5d4031]">{previewTitle}</p>
        {form.imagePreviewUrl ? (
          <div className="mt-4 flex justify-center rounded-[1.2rem] bg-[linear-gradient(180deg,#fffaf6_0%,#fff2e6_100%)] p-4">
            <img
              src={form.imagePreviewUrl}
              alt={form.productName || "Product preview"}
              className="h-52 w-auto object-contain"
            />
          </div>
        ) : (
          <div className="mt-4 flex h-56 items-center justify-center rounded-[1.2rem] border border-dashed border-[#e4d2c2] bg-[#fff9f4] text-sm text-[#8a6c58]">
            Select a product image to preview it here.
          </div>
        )}
      </div>
    </div>
  );
}
