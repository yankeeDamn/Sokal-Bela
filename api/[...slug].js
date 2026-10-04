module.exports = function handler(req, res) {
  try {
    const method = req.method || 'GET';
    const url = req.url || '/';
    res.status(404).json({
      error: 'Not Found',
      message: `No API route for ${method} ${url}`
    });
  } catch (err) {
    res.status(200).json({ error: 'Not Found' });
  }
};
