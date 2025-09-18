import { db } from './firebase-config.js';

// Vegetable collection reference
const vegetablesRef = db.collection('vegetables');

// CRUD Operations
export const dbOperations = {
    // Get all vegetables
    getAllVegetables: async () => {
        try {
            const snapshot = await vegetablesRef.get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting vegetables:', error);
            throw error;
        }
    },

    // Add a new vegetable
    addVegetable: async (vegetableData) => {
        try {
            const docRef = await vegetablesRef.add(vegetableData);
            return docRef.id;
        } catch (error) {
            console.error('Error adding vegetable:', error);
            throw error;
        }
    },

    // Update a vegetable
    updateVegetable: async (id, vegetableData) => {
        try {
            await vegetablesRef.doc(id).update(vegetableData);
            return true;
        } catch (error) {
            console.error('Error updating vegetable:', error);
            throw error;
        }
    },

    // Delete a vegetable
    deleteVegetable: async (id) => {
        try {
            await vegetablesRef.doc(id).delete();
            return true;
        } catch (error) {
            console.error('Error deleting vegetable:', error);
            throw error;
        }
    },

    // Get a single vegetable by ID
    getVegetableById: async (id) => {
        try {
            const doc = await vegetablesRef.doc(id).get();
            if (!doc.exists) {
                throw new Error('Vegetable not found');
            }
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error('Error getting vegetable:', error);
            throw error;
        }
    }
};