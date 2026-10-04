module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    success: false,
    products: [],
    message: 'Using Firestore fallback for products'
  });
};

