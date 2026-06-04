import { useEffect, useState } from 'react'
import AuthModal from '../components/AuthModal'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { fetchPublicProducts, type ProductRecord } from '../api/products'
import { resolveMediaUrl } from '../api/client'

const fallbackProducts: ProductRecord[] = [
  {
    id: 'prod-1',
    productName: 'Nestle Milo Chocolate Malt Food Drink 400g',
    sku: 'NES-MILO-400',
    categoryId: 'a64a53fc-7dd0-41a8-bcaa-0c2972db3bc0',
    categoryName: 'Malted Drinks',
    brand: 'Nestle',
    packSize: '400g',
    unitPrice: 890,
    productsPerCase: 12,
    casePrice: 10200,
    barcode: '4792004000012',
    description: 'Chocolate malt beverage powder for everyday retail distribution.',
    imageUrl: '/uploads/products/nestle-milo-chocolate-malt-food-drink-400g-1774669840566-241153302.png',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    productName: 'Maggi Chicken Flavour Instant Noodles 70g',
    sku: 'MAG-NOODLES-CHICKEN-070',
    categoryId: '6a43ed3f-753b-4a29-bdd8-ad44471969bb',
    categoryName: 'Culinary',
    brand: 'Maggi',
    packSize: '70g',
    unitPrice: 100,
    productsPerCase: 30,
    casePrice: 2850,
    barcode: '4790987654321',
    description: 'Maggi chicken flavor instant noodles',
    imageUrl: '/uploads/products/maggi-chicken-flavour-instant-noodles-70g-1774668089939-453386041.png',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    productName: 'Nescafe 3 in 1 Classic Coffee Mix 20 Sticks',
    sku: 'NES-3IN1-CLASSIC-20',
    categoryId: '25694b1c-ded3-49e9-8420-fed18b725102',
    categoryName: 'Beverages',
    brand: 'Nescafe',
    packSize: 'Standard',
    unitPrice: 680,
    productsPerCase: 12,
    casePrice: 7800,
    barcode: '4791122334455',
    description: 'Nescafe 3 in 1 classic instant coffee mix sticks',
    imageUrl: '/uploads/products/nescafe-3-in-1-classic-coffee-mix-20-sticks-1774668023253-386423688.webp',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-4',
    productName: 'Nestle Nestomalt Malted Food Drink 400g',
    sku: 'NES-NESTOMALT-400',
    categoryId: 'a64a53fc-7dd0-41a8-bcaa-0c2972db3bc0',
    categoryName: 'Malted Drinks',
    brand: 'Nestle',
    packSize: '400g',
    unitPrice: 780,
    productsPerCase: 12,
    casePrice: 9000,
    barcode: '4795544332211',
    description: 'Nestomalt malted milk drink',
    imageUrl: '/uploads/products/nestle-nestomalt-malted-food-drink-400g-1774669879026-574375151.png',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export default function PublicProductsPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetchPublicProducts()
        const activeProducts = response?.products || []
        
        if (activeProducts.length === 0) {
          // If the database is completely empty (or no active products), use fallback data for demonstration
          setProducts(fallbackProducts)
        } else {
          setProducts(activeProducts)
        }
      } catch (error) {
        console.error("Failed to load products, using fallback data", error)
        setProducts(fallbackProducts)
      } finally {
        setIsLoading(false)
      }
    }
    void loadProducts()
  }, [])

  return (
    <div className="bg-white text-[#1a120c] min-h-screen flex flex-col">
      {/* HEADER SECTION (Matching Hero Theme) */}
      <section className="relative isolate overflow-hidden border-b border-[#2d1209] bg-[#100603] text-white">
        <div className="hero-shell absolute inset-0" />
        <div className="hero-ambient absolute inset-0 float-drift opacity-70" />
        <div className="grain-overlay absolute inset-0 opacity-25" />
        
        <div className="relative z-10">
          <Navbar onLoginClick={() => setIsAuthModalOpen(true)} />
          
          <div className="flex w-full flex-col justify-center px-7 pb-16 pt-12 text-center sm:px-9 lg:pb-24 lg:pt-16">
            <h1 className="hero-reference-font animate-rise text-[3rem] font-[700] leading-tight tracking-[-0.05em] text-[rgba(249,241,234,0.9)] drop-shadow-[0_8px_28px_rgba(0,0,0,0.35)] sm:text-[3.8rem]">
              Our Products
            </h1>
            <p className="hero-subtitle-font animate-rise mx-auto mt-4 max-w-2xl text-[1.1rem] leading-8 text-[#CDB6A9] sm:text-[1.2rem]" style={{ animationDelay: '140ms' }}>
              Explore our complete collection of premium products. Quality you can trust, delivered with precision.
            </p>
          </div>
        </div>
      </section>

      {/* PRODUCTS GRID */}
      <main className="flex-1 bg-white px-5 py-16 sm:px-8 lg:px-12 2xl:px-16">
        <div className="mx-auto max-w-[1800px]">
          {isLoading ? (
            <div className="flex justify-center py-20 text-[#a37d63]">
              <div className="text-lg font-medium">Loading catalog...</div>
            </div>
          ) : products.length === 0 ? (
            <div className="flex justify-center py-20 text-[#7f6657]">
              <div className="text-lg">No products available at the moment.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="group flex flex-col overflow-hidden rounded-[1.25rem] border border-[#ead8ca] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(72,34,14,0.08)]"
                >
                  {/* Image container */}
                  <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.96),transparent_42%),linear-gradient(180deg,#fffdfb_0%,#fff4e9_100%)] p-6">
                    {product.imageUrl ? (
                      <img
                        src={resolveMediaUrl(product.imageUrl)}
                        alt={product.productName}
                        className="h-full w-auto object-contain transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-32 w-24 items-center justify-center rounded-[1rem] bg-[#f4e3d3] text-xl font-bold text-[#8a5d41]">
                        {product.productName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex flex-1 flex-col p-5">
                    <span className="mb-2 text-xs font-semibold tracking-wider text-[#a37d63] uppercase">
                      {product.categoryName}
                    </span>
                    <h3 className="text-lg font-bold leading-snug text-[#342015] mb-2 line-clamp-2">
                      {product.productName}
                    </h3>
                    
                    {/* Stock & Case details */}
                    <div className="mb-4 flex items-center gap-2 text-sm text-[#7f6657]">
                      <span className="inline-flex items-center rounded bg-[#f5ebe4] px-2 py-0.5 text-xs font-semibold text-[#8b5a3a]">
                        In Stock
                      </span>
                      <span>•</span>
                      <span>{product.productsPerCase} Item{product.productsPerCase !== 1 ? 's' : ''} / Case</span>
                    </div>
                    
                    {/* Footer */}
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#f0e6dd]">
                      <span className="text-[1.35rem] font-bold text-[#b86d35]">
                        {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(product.unitPrice)}
                      </span>
                      <button className="rounded-[0.85rem] border border-[#d7baa3] bg-[#fff7f0] px-4 py-2 text-sm font-semibold text-[#8b5a3a] transition duration-300 hover:border-[#c9976f] hover:bg-[#8b5a3a] hover:text-white">
                        View Details
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  )
}
