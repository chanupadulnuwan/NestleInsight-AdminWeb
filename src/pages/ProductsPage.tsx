import type { ChangeEvent } from "react";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { fetchCategories, type CategoryRecord } from "../api/categories";
import { getApiErrorCode, getApiErrorMessage } from "../api/client";
import {
  checkSkuAvailability,
  createProduct,
  fetchProducts,
  type ProductRecord,
  updateProduct,
} from "../api/products";
import { useAuth } from "../context/AuthContext";
import {
  NavGlyph,
  ProductFormFields,
  ProductImagePanels,
} from "./productsPage.components";
import {
  brandSuggestions,
  createEmptyProductForm,
  formatCurrency,
  formatPortalDate,
  formatProductId,
  formatStatusLabel,
  getProductInitials,
  imageAcceptValue,
  navigationItems,
  productToForm,
  readFileAsDataUrl,
  sortProducts,
  surfaceClassName,
  syncAutomaticCasePrice,
  toProductPayload,
  type AdminSection,
  type FormMode,
  type ProductFilterStatus,
  type ProductFormErrors,
  type ProductFormState,
  validateProductForm,
  allowedImageTypes,
} from "./productsPage.helpers";

export default function ProductsPage() {
  const navigate = useNavigate();
  const { user, isAuthLoading, logout } = useAuth();
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [detailFeedback, setDetailFeedback] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] =
    useState<ProductFilterStatus>("ALL");
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isCheckingCreateSku, setIsCheckingCreateSku] = useState(false);
  const [isCheckingEditSku, setIsCheckingEditSku] = useState(false);
  const [createForm, setCreateForm] = useState<ProductFormState>(
    createEmptyProductForm(),
  );
  const [editForm, setEditForm] = useState<ProductFormState>(
    createEmptyProductForm(),
  );
  const [createErrors, setCreateErrors] = useState<ProductFormErrors>({});
  const [editErrors, setEditErrors] = useState<ProductFormErrors>({});
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(
    null,
  );
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const isAdmin = user?.role === "ADMIN";

  const getValidationErrors = (mode: FormMode, form: ProductFormState) =>
    validateProductForm(form, {
      categories,
      products,
      mode,
      selectedProductId: mode === "edit" ? selectedProduct?.id : undefined,
    });

  const setModeErrors = (mode: FormMode, errors: ProductFormErrors) => {
    if (mode === "create") {
      setCreateErrors(errors);
      return;
    }

    setEditErrors(errors);
  };

  const clearDetailNotice = () => {
    setDetailFeedback(null);
    setDetailError(null);
  };

  const getModeErrors = (mode: FormMode) =>
    mode === "create" ? createErrors : editErrors;

  const clearFileInput = (mode: FormMode) => {
    const targetRef = mode === "create" ? createFileInputRef : editFileInputRef;
    if (targetRef.current) targetRef.current.value = "";
  };

  const updateFormState = (mode: FormMode, nextForm: ProductFormState) => {
    if (mode === "create") {
      setCreateForm(nextForm);
    } else {
      setEditForm(nextForm);
    }

    if (Object.keys(getModeErrors(mode)).length > 0) {
      setModeErrors(mode, getValidationErrors(mode, nextForm));
    }
  };

  const resetCreateForm = () => {
    setCreateForm(createEmptyProductForm());
    setCreateErrors({});
    clearFileInput("create");
  };

  const resetEditForm = () => {
    if (!selectedProduct) return;
    setEditForm(productToForm(selectedProduct));
    setEditErrors({});
    clearDetailNotice();
    clearFileInput("edit");
  };

  const handleServerFieldError = (mode: FormMode, errorCode?: string) => {
    if (!errorCode) return;

    if (errorCode === "PRODUCT_SKU_NOT_UNIQUE") {
      setModeErrors(mode, {
        ...getModeErrors(mode),
        sku: "This SKU already exists.",
      });
      return;
    }

    if (errorCode === "PRODUCT_CATEGORY_NOT_FOUND") {
      setModeErrors(mode, {
        ...getModeErrors(mode),
        categoryId: "Select a valid category.",
      });
      return;
    }

    if (
      errorCode === "PRODUCT_IMAGE_REQUIRED" ||
      errorCode === "PRODUCT_IMAGE_INVALID_TYPE"
    ) {
      setModeErrors(mode, {
        ...getModeErrors(mode),
        image: "Upload a PNG, JPG, WEBP, or GIF image.",
      });
    }
  };

  const loadCatalog = async () => {
    setIsLoading(true);
    setPageError(null);

    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);
      setProducts(sortProducts(productsResponse.products));
      setCategories(categoriesResponse.categories);
    } catch (requestError) {
      setPageError(
        getApiErrorMessage(requestError, "Unable to load products right now."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) void loadCatalog();
  }, [isAdmin]);

  useEffect(() => {
    if (!feedback && !pageError) return;
    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
      setPageError(null);
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [feedback, pageError]);

  useEffect(() => {
    if (!detailFeedback && !detailError) return;
    const timeoutId = window.setTimeout(() => {
      setDetailFeedback(null);
      setDetailError(null);
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [detailError, detailFeedback]);

  useEffect(() => {
    if (
      selectedCategory === "ALL" ||
      categories.some((category) => category.name === selectedCategory)
    )
      return;
    setSelectedCategory("ALL");
  }, [categories, selectedCategory]);

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[#6e5647]">
        Loading products...
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/admin/dashboard" replace />;

  const goToSection = (section: AdminSection) => {
    navigate(
      section === "dashboard"
        ? "/admin/dashboard"
        : `/admin/dashboard?section=${section}`,
    );
  };

  const categoryFilters = [
    "ALL",
    ...categories.map((category) => category.name),
  ];
  const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "ALL" || product.categoryName === selectedCategory;
    const matchesStatus =
      selectedStatus === "ALL" || product.status === selectedStatus;
    const haystack =
      `${product.productName} ${product.sku} ${product.id} ${product.brand ?? ""} ${product.packSize} ${product.barcode ?? ""}`.toLowerCase();
    return (
      matchesCategory &&
      matchesStatus &&
      (!normalizedSearchTerm || haystack.includes(normalizedSearchTerm))
    );
  });

  const handleFieldChange = (
    mode: FormMode,
    field: keyof ProductFormState,
    value: string,
  ) => {
    if (mode === "edit") clearDetailNotice();
    const currentForm = mode === "create" ? createForm : editForm;
    const nextForm = syncAutomaticCasePrice({
      ...currentForm,
      [field]: field === "sku" ? value.toUpperCase() : value,
    });
    updateFormState(mode, nextForm);
  };

  const handleCasePriceModeChange = (mode: FormMode, manual: boolean) => {
    if (mode === "edit") clearDetailNotice();
    const currentForm = mode === "create" ? createForm : editForm;
    updateFormState(
      mode,
      syncAutomaticCasePrice({
        ...currentForm,
        isCasePriceManual: manual,
      }),
    );
  };

  const handleSkuBlur = async (mode: FormMode) => {
    const currentForm = mode === "create" ? createForm : editForm;
    const localErrors = getValidationErrors(mode, currentForm);
    if (localErrors.sku) {
      setModeErrors(mode, { ...getModeErrors(mode), sku: localErrors.sku });
      return;
    }

    const normalizedSku = currentForm.sku.trim().toUpperCase();
    if (!normalizedSku) return;

    mode === "create"
      ? setIsCheckingCreateSku(true)
      : setIsCheckingEditSku(true);

    try {
      const response = await checkSkuAvailability(
        normalizedSku,
        mode === "edit" ? selectedProduct?.id : undefined,
      );
      if (!response.isAvailable) {
        setModeErrors(mode, { ...getModeErrors(mode), sku: response.message });
        return;
      }

      const nextErrors = { ...getModeErrors(mode) };
      delete nextErrors.sku;
      setModeErrors(mode, nextErrors);
    } finally {
      mode === "create"
        ? setIsCheckingCreateSku(false)
        : setIsCheckingEditSku(false);
    }
  };

  const handleImageSelection = async (
    event: ChangeEvent<HTMLInputElement>,
    mode: FormMode,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (mode === "edit") clearDetailNotice();

    if (!allowedImageTypes.has(file.type)) {
      setModeErrors(mode, {
        ...getModeErrors(mode),
        image: "Upload a PNG, JPG, WEBP, or GIF image.",
      });
      clearFileInput(mode);
      return;
    }

    try {
      const imagePreviewUrl = await readFileAsDataUrl(file);
      const currentForm = mode === "create" ? createForm : editForm;
      updateFormState(mode, {
        ...currentForm,
        imageFile: file,
        imagePreviewUrl,
        imageFileName: file.name,
      });

      const nextErrors = { ...getModeErrors(mode) };
      delete nextErrors.image;
      setModeErrors(mode, nextErrors);
    } catch (requestError) {
      setPageError(
        getApiErrorMessage(
          requestError,
          "Unable to load the selected product image.",
        ),
      );
    } finally {
      clearFileInput(mode);
    }
  };

  const handleRemoveImage = (mode: FormMode) => {
    if (mode === "edit") clearDetailNotice();
    const currentForm = mode === "create" ? createForm : editForm;
    const fallbackPreview =
      mode === "edit" ? (selectedProduct?.imageUrl ?? "") : "";
    updateFormState(mode, {
      ...currentForm,
      imageFile: null,
      imagePreviewUrl: fallbackPreview,
      imageFileName: "",
    });
  };

  const handleCreateProduct = async () => {
    const validationErrors = getValidationErrors("create", createForm);
    setCreateErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setPageError(
        "Please correct the highlighted product form fields before saving.",
      );
      return;
    }

    setIsCreatingProduct(true);
    setPageError(null);
    setFeedback(null);

    try {
      const response = await createProduct(toProductPayload(createForm));
      const nextProducts = sortProducts([...products, response.product]);
      setProducts(nextProducts);
      setSelectedProduct(response.product);
      setEditForm(productToForm(response.product));
      setEditErrors({});
      resetCreateForm();
      setIsAddPanelOpen(false);
      setFeedback(response.message);
    } catch (requestError) {
      handleServerFieldError("create", getApiErrorCode(requestError));
      setPageError(
        getApiErrorMessage(
          requestError,
          "Unable to create the product right now.",
        ),
      );
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!selectedProduct) return;
    const validationErrors = getValidationErrors("edit", editForm);
    setEditErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setFeedback(null);
      setPageError(null);
      setDetailFeedback(null);
      setDetailError(
        "Please correct the highlighted product fields before saving changes.",
      );
      return;
    }

    setIsSavingProduct(true);
    setPageError(null);
    setFeedback(null);
    setDetailError(null);
    setDetailFeedback(null);

    try {
      const response = await updateProduct(
        selectedProduct.id,
        toProductPayload(editForm),
      );
      const successMessage = "Product details updated successfully.";
      setProducts(
        sortProducts(
          products.map((product) =>
            product.id === response.product.id ? response.product : product,
          ),
        ),
      );
      setSelectedProduct(response.product);
      setEditForm(productToForm(response.product));
      setEditErrors({});
      setFeedback(successMessage);
      setDetailFeedback(successMessage);
    } catch (requestError) {
      handleServerFieldError("edit", getApiErrorCode(requestError));
      setPageError(null);
      setDetailFeedback(null);
      setDetailError(
        getApiErrorMessage(
          requestError,
          "Unable to save the product changes right now.",
        ),
      );
    } finally {
      setIsSavingProduct(false);
    }
  };

  const detailRows: Array<[string, string]> = selectedProduct
    ? [
        ["Product ID", selectedProduct.id],
        ["Product Name", selectedProduct.productName],
        ["SKU", selectedProduct.sku],
        ["Category", selectedProduct.categoryName],
        ["Brand", selectedProduct.brand || "Not provided"],
        ["Pack Size / Variant", selectedProduct.packSize],
        ["Unit Price", formatCurrency(selectedProduct.unitPrice)],
        ["Products Per Case", selectedProduct.productsPerCase.toString()],
        ["Case Price", formatCurrency(selectedProduct.casePrice)],
        ["Barcode", selectedProduct.barcode || "Not provided"],
        ["Status", formatStatusLabel(selectedProduct.status)],
        ["Description", selectedProduct.description || "Not provided"],
        ["Created at", formatPortalDate(selectedProduct.createdAt)],
        ["Updated at", formatPortalDate(selectedProduct.updatedAt)],
      ]
    : [];

  return (
    <div className="min-h-screen bg-white text-[#1e130c]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col bg-[linear-gradient(180deg,#341d12_0%,#24130c_48%,#1a0d08_100%)] px-5 py-6 text-[#fff6ee] lg:sticky lg:top-0 lg:h-screen lg:w-[18.75rem] lg:px-6 lg:pt-7 lg:pb-8">
          <div className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-[1rem] bg-white/10 p-2.5 shadow-[0_16px_34px_rgba(0,0,0,0.18)]">
                <img
                  src="/images/insight-logo.png"
                  alt="Nestle Insight"
                  className="h-11 w-auto"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#e1ba97]">
                  Nestle Insight
                </p>
                <p className="mt-1 text-sm text-[#e9d7cb]">Admin Portal</p>
              </div>
            </div>
          </div>
          <nav className="mt-8 flex flex-1 flex-col gap-2">
            {navigationItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => goToSection(item.key)}
                className="flex items-center gap-3 rounded-[1.35rem] px-3 py-3 text-left transition duration-300 hover:bg-white/8"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-white/10 bg-black/10 text-[#f2ddca]">
                  <NavGlyph name={item.key} />
                </span>
                <span className="block truncate text-[0.97rem] font-semibold text-[#fff6ee]">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
          <div className="mt-8 rounded-[1.5rem] border border-white/12 bg-white/6 px-4 py-4 backdrop-blur-sm lg:mt-auto">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#d7965f] to-[#b86d35] text-sm font-bold text-white">
                {user.firstName.charAt(0).toUpperCase()}
                {user.lastName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#fff6ee]">
                  {user.username}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#dcc7b8]">
                  Admin
                </p>
              </div>
            </div>
          </div>
        </aside>
        <main className="section-shell relative flex-1 overflow-hidden bg-white">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#fff4e8] via-white to-white" />
          <div className="grain-overlay pointer-events-none absolute inset-0 opacity-[0.05]" />
          <div className="relative flex flex-col gap-6 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
            <section>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#a37d63]">
                    Portal / Dashboard / Products
                  </p>
                  <h1 className="mt-3 text-[2.2rem] font-bold tracking-[-0.05em] text-[#342015] sm:text-[2.7rem]">
                    Product Catalog
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[#7f6657] sm:text-[1rem]">
                    Search, filter, add, and update products with clean category
                    mapping, practical pricing, product images, and operational
                    SKU controls.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/admin/dashboard")}
                    className="rounded-[1rem] bg-[#879f33] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(115,141,44,0.18)] transition duration-300 hover:bg-[#74892d]"
                  >
                    Back to dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f]"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </section>
            {feedback ? (
              <div className="rounded-[1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3 text-sm text-[#4d6c45]">
                {feedback}
              </div>
            ) : null}
            {pageError ? (
              <div className="rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]">
                {pageError}
              </div>
            ) : null}
            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                  Search And Filter
                </p>
                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_15rem]">
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by product name, SKU, brand, barcode, or product ID"
                    className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267]"
                  />
                  <select
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(
                        event.target.value as ProductFilterStatus,
                      )
                    }
                    className="rounded-[1rem] border border-[#e5d3c6] bg-[#fffdfb] px-4 py-3 text-sm text-[#452d1f] outline-none transition duration-300 focus:border-[#c99267]"
                  >
                    <option value="ALL">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold text-[#8a6c58]">
                      Catalog size
                    </p>
                    <p className="mt-2 text-[1.55rem] font-bold text-[#4d3020]">
                      {products.length}
                    </p>
                  </div>
                  <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold text-[#8a6c58]">
                      Visible products
                    </p>
                    <p className="mt-2 text-[1.55rem] font-bold text-[#4d3020]">
                      {filteredProducts.length}
                    </p>
                  </div>
                  <div className="rounded-[1.35rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4">
                    <p className="text-sm font-semibold text-[#8a6c58]">
                      Status filter
                    </p>
                    <p className="mt-2 text-[1.2rem] font-bold text-[#4d3020]">
                      {selectedStatus === "ALL"
                        ? "All statuses"
                        : formatStatusLabel(selectedStatus)}
                    </p>
                  </div>
                </div>
              </article>
              <article className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                      Add Product
                    </p>
                    <h2 className="mt-2 text-[1.45rem] font-bold tracking-[-0.04em] text-[#4d3020]">
                      Create new product records
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-[#7f6657]">
                      Product ID will be generated automatically after saving.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddPanelOpen((current) => !current)}
                    className="rounded-[1rem] border border-[#d7baa3] bg-[#fff7f0] px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
                  >
                    {isAddPanelOpen ? "Hide form" : "Add product"}
                  </button>
                </div>
              </article>
            </section>
            <section className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                  Categories
                </p>
                {categoryFilters.map((categoryName) => {
                  const count =
                    categoryName === "ALL"
                      ? products.length
                      : products.filter(
                          (product) => product.categoryName === categoryName,
                        ).length;
                  const isActive = selectedCategory === categoryName;
                  return (
                    <button
                      key={categoryName}
                      type="button"
                      onClick={() => setSelectedCategory(categoryName)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition duration-300 ${isActive ? "bg-[#8b5a3a] text-white shadow-[0_14px_24px_rgba(139,90,58,0.16)]" : "border border-[#e2d0c1] bg-[#fff9f4] text-[#6b4b39] hover:border-[#ca9a72]"}`}
                    >
                      {categoryName === "ALL"
                        ? "All categories"
                        : `${categoryName} (${count})`}
                    </button>
                  );
                })}
              </div>
            </section>
            {isAddPanelOpen ? (
              <section className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
                <ProductFormFields
                  mode="create"
                  form={createForm}
                  errors={createErrors}
                  categories={categories}
                  isCheckingSku={isCheckingCreateSku}
                  onFieldChange={handleFieldChange}
                  onSkuBlur={handleSkuBlur}
                  onCasePriceModeChange={handleCasePriceModeChange}
                  gridClassName="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                />
                <ProductImagePanels
                  mode="create"
                  form={createForm}
                  error={createErrors.image}
                  title="Product Image"
                  previewTitle="Preview"
                  helperText="Upload the product image so it can be stored with the record and previewed immediately."
                  inputRef={createFileInputRef}
                  onImageSelection={handleImageSelection}
                  onRemoveImage={handleRemoveImage}
                  imageAcceptValue={imageAcceptValue}
                />
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleCreateProduct()}
                    disabled={isCreatingProduct}
                    className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isCreatingProduct ? "Saving product..." : "Save product"}
                  </button>
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    disabled={isCreatingProduct}
                    className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Reset form
                  </button>
                </div>
              </section>
            ) : null}
            <section className={`${surfaceClassName} px-6 py-6 sm:px-7`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                    Product List
                  </p>
                  <h2 className="mt-2 text-[1.55rem] font-bold tracking-[-0.04em] text-[#4d3020]">
                    All product details, pricing, variants, and status controls
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => void loadCatalog()}
                  className="rounded-[1rem] border border-[#d7baa3] bg-[#fff7f0] px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
                >
                  Refresh catalog
                </button>
              </div>
              {isLoading ? (
                <div className="mt-5 rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4 text-sm text-[#7f6657]">
                  Loading products...
                </div>
              ) : null}
              {!isLoading && filteredProducts.length === 0 ? (
                <div className="mt-5 rounded-[1.2rem] border border-dashed border-[#ead8ca] bg-[#fffdfb] px-4 py-4 text-sm text-[#7f6657]">
                  No products matched the current search and filters.
                </div>
              ) : null}
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(product);
                      setEditForm(productToForm(product));
                      setEditErrors({});
                      clearDetailNotice();
                      clearFileInput("edit");
                    }}
                    className="card-sheen overflow-hidden rounded-[1.5rem] border border-[#ead8ca] bg-[linear-gradient(180deg,#fffaf6_0%,#fff3ea_100%)] text-left transition duration-300 hover:-translate-y-1 hover:border-[#d7baa3] hover:shadow-[0_20px_40px_rgba(72,34,14,0.12)]"
                  >
                    <div className="flex h-56 items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.96),transparent_42%),linear-gradient(180deg,#fffdfb_0%,#fff4e9_100%)] p-5">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.productName}
                          className="h-full w-auto object-contain"
                        />
                      ) : (
                        <div className="flex h-44 w-32 items-center justify-center rounded-[1.2rem] bg-[#f4e3d3] text-2xl font-bold text-[#8a5d41]">
                          {getProductInitials(product)}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3 px-5 py-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-[#f4e3d3] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a5d41]">
                          ID {formatProductId(product.id)}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${product.status === "ACTIVE" ? "border border-[#cad9ba] bg-[#f2faed] text-[#547243]" : "border border-[#e2c8b6] bg-[#fff5ec] text-[#8a5d41]"}`}
                        >
                          {formatStatusLabel(product.status)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-[1.1rem] font-bold leading-6 tracking-[-0.03em] text-[#3f2518]">
                          {product.productName}
                        </h3>
                        <p className="mt-2 text-sm text-[#7f6657]">
                          {product.brand ? `${product.brand} • ` : ""}
                          {product.packSize}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-[#dcc5b2] px-3 py-1 text-xs font-semibold text-[#6c4a37]">
                          {product.categoryName}
                        </span>
                        <span className="rounded-full border border-[#e6d5c7] px-3 py-1 text-xs font-semibold text-[#6c4a37]">
                          {product.productsPerCase} / case
                        </span>
                      </div>
                      <div className="grid gap-3 text-sm text-[#6c5647] sm:grid-cols-2">
                        <div className="rounded-[1rem] bg-white/70 px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a37d63]">
                            Unit Price
                          </p>
                          <p className="mt-2 font-bold text-[#4d3020]">
                            {formatCurrency(product.unitPrice)}
                          </p>
                        </div>
                        <div className="rounded-[1rem] bg-white/70 px-3 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a37d63]">
                            Case Price
                          </p>
                          <p className="mt-2 font-bold text-[#4d3020]">
                            {formatCurrency(product.casePrice)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[#8b5a3a]">
                        <span>{product.sku}</span>
                        <span>
                          {product.barcode ? "Barcode saved" : "No barcode"}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
      <datalist id="brand-list">
        {brandSuggestions.map((brand) => (
          <option key={brand} value={brand} />
        ))}
      </datalist>
      {selectedProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#140704]/55 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[#e6d6ca] bg-white shadow-[0_30px_80px_rgba(33,13,6,0.24)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#f0e4dc] px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                  Product Details
                </p>
                <h2 className="mt-2 text-[1.9rem] font-bold tracking-[-0.04em] text-[#342015]">
                  {selectedProduct.productName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProduct(null);
                  setEditForm(createEmptyProductForm());
                  setEditErrors({});
                  clearDetailNotice();
                  clearFileInput("edit");
                }}
                className="rounded-[1rem] border border-[#dcc1ab] bg-[#fff6ee] px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020]"
              >
                Close
              </button>
            </div>
            <div className="grid max-h-[calc(92vh-5.5rem)] gap-6 overflow-y-auto px-6 py-6 lg:grid-cols-[1fr_1.1fr]">
              <article className={`${surfaceClassName} px-5 py-5`}>
                <div className="flex justify-center rounded-[1.5rem] bg-[linear-gradient(180deg,#fffdfb_0%,#fff4e9_100%)] p-6">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.productName}
                      className="h-72 w-auto object-contain"
                    />
                  ) : (
                    <div className="flex h-72 w-56 items-center justify-center rounded-[1.2rem] bg-[#f4e3d3] text-2xl font-bold text-[#8a5d41]">
                      {getProductInitials(selectedProduct)}
                    </div>
                  )}
                </div>
                <div className="mt-5 overflow-hidden rounded-[1.2rem] border border-[#efe4dc]">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {detailRows.map(([label, value]) => (
                        <tr
                          key={label}
                          className="border-b border-[#f1e7e0] last:border-b-0"
                        >
                          <td className="w-[42%] bg-[#fff9f5] px-4 py-3 font-semibold text-[#5d4031]">
                            {label}
                          </td>
                          <td className="px-4 py-3 text-[#7f6657]">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
              <article className={`${surfaceClassName} px-5 py-5`}>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#a37d63]">
                  Edit Product
                </p>
                <h3 className="mt-2 text-[1.45rem] font-bold tracking-[-0.04em] text-[#4d3020]">
                  Change product details, pricing, image, and status without
                  leaving the current product view
                </h3>
                <div className="mt-5">
                  <ProductFormFields
                    mode="edit"
                    form={editForm}
                    errors={editErrors}
                    categories={categories}
                    isCheckingSku={isCheckingEditSku}
                    onFieldChange={handleFieldChange}
                    onSkuBlur={handleSkuBlur}
                    onCasePriceModeChange={handleCasePriceModeChange}
                    gridClassName="grid gap-4 md:grid-cols-2"
                  />
                </div>
                <ProductImagePanels
                  mode="edit"
                  form={editForm}
                  error={editErrors.image}
                  title="Replace Product Image"
                  previewTitle="Current Preview"
                  helperText="Upload a new image if the product packaging changes or if the current image needs to be refreshed."
                  inputRef={editFileInputRef}
                  onImageSelection={handleImageSelection}
                  onRemoveImage={handleRemoveImage}
                  imageAcceptValue={imageAcceptValue}
                />
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSaveProduct()}
                    disabled={isSavingProduct}
                    className="rounded-[1rem] bg-[#8b5a3a] px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingProduct ? "Saving changes..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={resetEditForm}
                    disabled={isSavingProduct}
                    className="rounded-[1rem] border border-[#d7baa3] bg-white px-4 py-3 text-sm font-semibold text-[#6e4d3b] transition duration-300 hover:border-[#c9976f] hover:text-[#4d3020] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Reset edits
                  </button>
                  {detailFeedback ? (
                    <div
                      aria-live="polite"
                      className="min-w-[16rem] flex-1 rounded-[1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3 text-sm text-[#4d6c45]"
                    >
                      {detailFeedback}
                    </div>
                  ) : null}
                  {detailError ? (
                    <div
                      aria-live="polite"
                      className="min-w-[16rem] flex-1 rounded-[1rem] border border-[#ebc0bb] bg-[#fff2f1] px-4 py-3 text-sm text-[#92524b]"
                    >
                      {detailError}
                    </div>
                  ) : null}
                </div>
              </article>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
