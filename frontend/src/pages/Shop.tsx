import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useCart } from '../contexts/CartContext';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  compare_price?: number;
  images: string[];
  inventory: number;
  category_name: string;
  category_slug: string;
}

interface Shop {
  id: number;
  name: string;
  description: string;
  slug: string;
  logo_url?: string;
  banner_url?: string;
  ownerName: string;
  productsCount: number;
}

const Shop: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchShopData();
    }
  }, [slug]);

  const fetchShopData = async () => {
    try {
      setLoading(true);
      const [shopResponse, productsResponse] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/api/shops/${slug}`),
        axios.get(`${process.env.REACT_APP_API_URL}/api/products/shop/${slug}`)
      ]);

      setShop(shopResponse.data.shop);
      setProducts(productsResponse.data.products);
    } catch (error) {
      setError('Failed to load shop data');
      console.error('Error fetching shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (!shop) return;

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.images[0],
      shopId: shop.id,
      shopName: shop.name,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Shop Not Found</h1>
          <p className="text-gray-600 mb-8">The shop you're looking for doesn't exist.</p>
          <Link to="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shop Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-6">
            {shop.logo_url && (
              <img
                src={shop.logo_url}
                alt={shop.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{shop.name}</h1>
              <p className="text-gray-600 mt-2">{shop.description}</p>
              <p className="text-sm text-gray-500 mt-1">
                By {shop.ownerName} • {shop.productsCount} products
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Products Yet</h2>
            <p className="text-gray-600">This shop hasn't added any products yet.</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product.id} className="card p-4 hover:shadow-lg transition-shadow">
                  <Link to={`/product/${product.id}`}>
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                        <span className="text-gray-400">No Image</span>
                      </div>
                    )}
                  </Link>
                  
                  <div className="space-y-2">
                    <Link to={`/product/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 hover:text-primary-600">
                        {product.name}
                      </h3>
                    </Link>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-primary-600">
                        ${product.price.toFixed(2)}
                      </span>
                      {product.compare_price && (
                        <span className="text-sm text-gray-500 line-through">
                          ${product.compare_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {product.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {product.category_name}
                      </span>
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.inventory === 0}
                        className="btn-primary text-sm py-1 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {product.inventory === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Shop;
