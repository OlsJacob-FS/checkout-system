import React from 'react';

const ManageProducts: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Products</h1>
          <p className="text-gray-600 mt-2">
            Add and manage products for your shop.
          </p>
        </div>

        <div className="card p-8 text-center">
          <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Management</h2>
          <p className="text-gray-600 mb-6">
            Product management features will be implemented here.
          </p>
          <button className="btn-primary">
            Add New Product
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageProducts;
