const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'liberty_2024_secret';
module.exports = (req,res,next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({error:'Необхідна авторизація'});
  try { req.admin = jwt.verify(h.slice(7), SECRET); next(); }
  catch { res.status(401).json({error:'Недійсний токен'}); }
};
