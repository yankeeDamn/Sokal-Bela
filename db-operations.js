import { db } from './firebase-config.js';

const REQUIRED_PRODUCT_FIELDS = ['name', 'description', 'category', 'price', 'stock', 'imageUrl', 'sellerId', 'status'];

function productsRef() {
  if (!db) throw new Error('Firestore is not initialized');
  return db.collection('products');
}

function validateProductPayload(product = {}) {
  for (const field of REQUIRED_PRODUCT_FIELDS) {
    if (!(field in product)) throw new Error(`Missing required field: ${field}`);
  }
  if (typeof product.name !== 'string' || !product.name.trim()) throw new Error('name is required');
  if (typeof product.description !== 'string') throw new Error('description must be a string');
  if (typeof product.category !== 'string' || !product.category.trim()) throw new Error('category is required');
  if (!Number.isFinite(Number(product.price)) || Number(product.price) < 0) throw new Error('price must be a non-negative number');
  if (!Number.isInteger(Number(product.stock)) || Number(product.stock) < 0) throw new Error('stock must be a non-negative integer');
  if (typeof product.imageUrl !== 'string') throw new Error('imageUrl must be a string');
  if (typeof product.sellerId !== 'string') throw new Error('sellerId must be a string');
  if (!['active', 'inactive', 'out_of_stock', 'archived'].includes(product.status)) throw new Error('invalid status');
}

export const dbOperations = {
  async getAllProducts() {
    const snapshot = await productsRef().get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  async addProduct(productData) {
    validateProductPayload(productData);
    const ref = productsRef().doc();
    const now = new Date().toISOString();
    await ref.set({
      productId: ref.id,
      ...productData,
      createdAt: productData.createdAt || now,
      updatedAt: productData.updatedAt || now,
    });
    return ref.id;
  },

  async updateProduct(id, updates) {
    if (!id) throw new Error('Product id is required');
    const ref = productsRef().doc(id);
    const existing = await ref.get();
    if (!existing.exists) throw new Error('Product not found');
    const next = {
      ...existing.data(),
      ...updates,
      productId: id,
      updatedAt: new Date().toISOString(),
    };
    validateProductPayload(next);
    await ref.set(next, { merge: true });
    return true;
  },

  async deleteProduct(id) {
    if (!id) throw new Error('Product id is required');
    await productsRef().doc(id).delete();
    return true;
  },

  async getProductById(id) {
    if (!id) throw new Error('Product id is required');
    const doc = await productsRef().doc(id).get();
    if (!doc.exists) throw new Error('Product not found');
    return { id: doc.id, ...doc.data() };
  },

  // Backward compatible aliases for legacy callers
  getAllVegetables() { return this.getAllProducts(); },
  addVegetable(data) { return this.addProduct(data); },
  updateVegetable(id, data) { return this.updateProduct(id, data); },
  deleteVegetable(id) { return this.deleteProduct(id); },
  getVegetableById(id) { return this.getProductById(id); },
};
