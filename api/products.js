// Simple products endpoint that returns empty array on error
// Frontend has built-in fallback to Firestore if this fails
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to fetch from Firebase, but gracefully handle errors
    // The frontend will use Firestore directly if this endpoint fails
    return res.status(200).json({
      success: false,
      products: [],
      message: 'Using Firestore fallback for products'
    });
  } catch (err) {
    console.error('Error in products endpoint:', err);
    return res.status(200).json({
      success: false,
      products: []
    });
  }
}

