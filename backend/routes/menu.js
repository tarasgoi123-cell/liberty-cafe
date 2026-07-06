const r = require('express').Router();
const { getDB } = require('../db/database');
const auth = require('../middleware/auth');

// public
r.get('/', (req,res) => {
  const db=getDB();
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort_order').all().map(c=>({...c,items:db.prepare('SELECT * FROM menu_items WHERE category_id=? AND is_available=1 ORDER BY sort_order').all(c.id)})));
});
r.get('/featured', (req,res) => {
  const db=getDB();
  res.json(db.prepare('SELECT mi.*,c.name as category_name FROM menu_items mi,categories c WHERE mi.category_id=c.id AND mi.is_featured=1 AND mi.is_available=1 ORDER BY mi.sort_order LIMIT 8').all());
});
r.get('/categories', (req,res) => res.json(getDB().prepare('SELECT * FROM categories ORDER BY sort_order').all()));

// admin
r.get('/admin/all', auth, (req,res) => {
  const db=getDB();
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort_order').all().map(c=>({...c,items:db.prepare('SELECT * FROM menu_items WHERE category_id=? ORDER BY sort_order').all(c.id)})));
});
r.post('/categories', auth, (req,res) => {
  const {name,name_en,icon,sort_order}=req.body;
  if (!name) return res.status(400).json({error:'Назва обов\'язкова'});
  const r2=getDB().prepare('INSERT INTO categories(name,name_en,icon,sort_order) VALUES(?,?,?,?)').run(name,name_en||null,icon||'☕',sort_order||0);
  res.json({id:r2.lastInsertRowid});
});
r.put('/categories/:id', auth, (req,res) => {
  const {name,name_en,icon,sort_order}=req.body;
  getDB().prepare('UPDATE categories SET name=?,name_en=?,icon=?,sort_order=? WHERE id=?').run(name,name_en,icon,sort_order,req.params.id);
  res.json({success:true});
});
r.delete('/categories/:id', auth, (req,res) => {
  const db=getDB();
  db.prepare('DELETE FROM menu_items WHERE category_id=?').run(req.params.id);
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.json({success:true});
});
r.post('/items', auth, (req,res) => {
  const {category_id,name,name_en,description,price,image_url,is_available,is_featured,sort_order}=req.body;
  if (!category_id||!name||!price) return res.status(400).json({error:'Категорія, назва і ціна обов\'язкові'});
  const r2=getDB().prepare('INSERT INTO menu_items(category_id,name,name_en,description,price,image_url,is_available,is_featured,sort_order) VALUES(?,?,?,?,?,?,?,?,?)').run(Number(category_id),name,name_en||null,description||null,Number(price),image_url||null,is_available??1,is_featured??0,sort_order||0);
  res.json({id:r2.lastInsertRowid});
});
r.put('/items/:id', auth, (req,res) => {
  const {category_id,name,name_en,description,price,image_url,is_available,is_featured,sort_order}=req.body;
  getDB().prepare('UPDATE menu_items SET category_id=?,name=?,name_en=?,description=?,price=?,image_url=?,is_available=?,is_featured=?,sort_order=? WHERE id=?').run(Number(category_id),name,name_en||null,description||null,Number(price),image_url||null,is_available??1,is_featured??0,sort_order||0,req.params.id);
  res.json({success:true});
});
r.delete('/items/:id', auth, (req,res) => {
  getDB().prepare('DELETE FROM menu_items WHERE id=?').run(req.params.id);
  res.json({success:true});
});

module.exports = r;
