'use strict';
// One Vercel Function handles all public v2 endpoints to stay within Hobby limits.
// Handlers live outside /api/ so they are bundled as modules, not deployed as functions.
const handlers=Object.freeze({
 products:require('../../lib/v2-handlers/products'),
 settings:require('../../lib/v2-handlers/settings'),
 orders:require('../../lib/v2-handlers/orders'),
 'order-lookup':require('../../lib/v2-handlers/order-lookup'),
 requests:require('../../lib/v2-handlers/requests'),
 subscriptions:require('../../lib/v2-handlers/subscriptions'),
 kitchen:require('../../lib/v2-handlers/kitchen'),
 auth:require('../../lib/v2-handlers/auth'),
 account:require('../../lib/v2-handlers/account'),
 payments:require('../../lib/v2-handlers/payments'),
 manage:require('../../lib/v2-handlers/manage'),
 admin:require('../../lib/v2-handlers/admin'),
 'admin-auth':require('../../lib/v2-handlers/admin-auth')
});
module.exports=async(req,res)=>{
 const endpoint=typeof req.query?.endpoint==='string'?req.query.endpoint:'';
 const handler=Object.prototype.hasOwnProperty.call(handlers,endpoint)?handlers[endpoint]:null;
 if(!handler)return res.status(404).json({ok:false,error:'Unknown API endpoint.'});
 return handler(req,res);
};
