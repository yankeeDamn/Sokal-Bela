export default function handler(req, res) {
  // This catch-all handler prevents 500 errors and returns a helpful response
  const { method, url } = req;
  
  console.log(`API endpoint not implemented: ${method} ${url}`);
  
  res.status(501).json({
    error: 'Not Implemented',
    message: `This API endpoint is not yet implemented: ${method} ${url}`,
    details: 'Please use the health endpoint: GET /api/health',
  });
}
