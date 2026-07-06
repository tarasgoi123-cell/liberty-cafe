const r = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDB } = require('../db/database');
const auth = require('../middleware/auth');

const uploadDir = path.join(__dirname,'../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir,{recursive:true});

const upload = multer({
  storage: multer.diskStorage({
    destination:(_,__,cb)=>cb(null,uploadDir),
    filename:(_,f,cb)=>cb(null,`${Date.now()}-${Math.random().toString(36).substr(2,8)}${path.extname(f.originalname).toLowerCase()}`)
  }),
  limits:{fileSize:8*1024*1024},
  fileFilter:(_,f,cb)=>(/\.(jpg|jpeg|png|webp|gif)$/i.test(f.originalname)?cb(null,true):cb(new Error('Тільки зображення')))
});

r.post('/upload', auth, upload.single('image'), (req,res) => {
  if (!req.file) return res.status(400).json({error:'Файл не завантажено'});
  res.json({url:`/uploads/${req.file.filename}`});
});

// gallery public
r.get('/gallery', (_,res) => res.json(getDB().prepare('SELECT * FROM gallery ORDER BY sort_order,id').all()));
r.get('/gallery/admin', auth, (_,res) => res.json(getDB().prepare('SELECT * FROM gallery ORDER BY sort_order,id').all()));
r.post('/gallery', auth, (req,res) => {
  const {title,image_url,sort_order}=req.body;
  if (!image_url) return res.status(400).json({error:'URL зображення обов\'язковий'});
  const r2=getDB().prepare('INSERT INTO gallery(title,image_url,sort_order) VALUES(?,?,?)').run(title||null,image_url,sort_order||0);
  res.json({id:r2.lastInsertRowid});
});
r.put('/gallery/:id', auth, (req,res) => {
  const {title,image_url,sort_order}=req.body;
  getDB().prepare('UPDATE gallery SET title=?,image_url=?,sort_order=? WHERE id=?').run(title||null,image_url,sort_order||0,req.params.id);
  res.json({success:true});
});
r.delete('/gallery/:id', auth, (req,res) => {
  const db=getDB(), item=db.prepare('SELECT image_url FROM gallery WHERE id=?').get(req.params.id);
  if (item?.image_url?.startsWith('/uploads/')) { const fp=path.join(uploadDir,path.basename(item.image_url)); if(fs.existsSync(fp)) fs.unlinkSync(fp); }
  db.prepare('DELETE FROM gallery WHERE id=?').run(req.params.id);
  res.json({success:true});
});

// contact & reservation public
r.post('/contact', (req,res) => {
  const {name,phone,email,message}=req.body;
  if (!name||!message) return res.status(400).json({error:'Ім\'я і повідомлення обов\'язкові'});
  getDB().prepare('INSERT INTO orders(name,phone,email,message) VALUES(?,?,?,?)').run(name,phone||null,email||null,message);
  res.json({success:true,message:'Дякуємо! Зв\'яжемося найближчим часом.'});
});
r.post('/reservation', (req,res) => {
  const {name,phone,date,time,guests,comment}=req.body;
  if (!name||!phone||!date||!time) return res.status(400).json({error:'Заповніть усі обов\'язкові поля'});
  getDB().prepare('INSERT INTO reservations(name,phone,date,time,guests,comment) VALUES(?,?,?,?,?,?)').run(name,phone,date,time,guests||2,comment||null);
  res.json({success:true,message:'Бронювання прийнято! Підтвердимо найближчим часом.'});
});

// admin contacts & reservations
r.get('/admin/contacts', auth, (req,res) => {
  const db=getDB(), {status}=req.query;
  const items=db.prepare('SELECT * FROM orders'+(status?' WHERE status=?':'')+' ORDER BY id DESC LIMIT 100').all(...(status?[status]:[]));
  const total=db.prepare('SELECT COUNT(*) as c FROM orders'+(status?' WHERE status=?':'')).get(...(status?[status]:[])).c;
  res.json({items,total});
});
r.patch('/admin/contacts/:id/status', auth, (req,res) => { getDB().prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status,req.params.id); res.json({success:true}); });
r.get('/admin/reservations', auth, (req,res) => {
  const db=getDB(), {status}=req.query;
  const items=db.prepare('SELECT * FROM reservations'+(status?' WHERE status=?':'')+' ORDER BY date ASC,time ASC LIMIT 100').all(...(status?[status]:[]));
  const total=db.prepare('SELECT COUNT(*) as c FROM reservations'+(status?' WHERE status=?':'')).get(...(status?[status]:[])).c;
  res.json({items,total});
});
r.patch('/admin/reservations/:id/status', auth, (req,res) => { getDB().prepare('UPDATE reservations SET status=? WHERE id=?').run(req.body.status,req.params.id); res.json({success:true}); });
r.get('/admin/stats', auth, (_,res) => {
  const db=getDB();
  res.json({menuItems:db.prepare('SELECT COUNT(*) as c FROM menu_items').get().c, contacts:db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='new'").get().c, reservations:db.prepare("SELECT COUNT(*) as c FROM reservations WHERE status='pending'").get().c, totalOrders:db.prepare('SELECT COUNT(*) as c FROM orders').get().c, totalReservations:db.prepare('SELECT COUNT(*) as c FROM reservations').get().c});
});
r.get('/admin/settings', auth, (_,res) => { const rows=getDB().prepare('SELECT * FROM settings').all(); const o={}; rows.forEach(r=>o[r.key]=r.value); res.json(o); });
r.put('/admin/settings', auth, (req,res) => { Object.entries(req.body).forEach(([k,v])=>getDB().prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').run(k,v)); res.json({success:true}); });
r.get('/settings', (_,res) => { const rows=getDB().prepare('SELECT * FROM settings').all(); const o={}; rows.forEach(r=>o[r.key]=r.value); res.json(o); });

module.exports = r;
