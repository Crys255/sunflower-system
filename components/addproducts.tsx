"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: any) => void;
}

export default function AddProductModal({ isOpen, onClose, onAdd }: AddProductModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    unitType: "",
    quantity: 0,
    price: 0,
    category: "",
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add New Product</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <form className="space-y-4">
          <input
            type="text"
            placeholder="Product Name"
            className="w-full px-3 py-2 border rounded-lg"
          />
          <select className="w-full px-3 py-2 border rounded-lg">
            <option>Gram</option>
            <option>Kilogram</option>
            <option>Pack</option>
            <option>Pcs</option>
          </select>
          <input
            type="number"
            placeholder="Quantity"
            className="w-full px-3 py-2 border rounded-lg"
          />
          <button className="w-full bg-yellow-500 text-white py-2 rounded-lg hover:bg-yellow-600">
            Add Product
          </button>
        </form>
      </div>
    </div>
  );
}