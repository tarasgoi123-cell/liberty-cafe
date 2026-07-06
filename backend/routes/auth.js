const r = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db/database');
const auth = require('../middleware/auth');
const SECRET = process.env.JWT_SECRET || 'liberty_2024_secret';

r.post('/login', (req,res) => {
  const {username,password} = req.body;
  if (!username||!password) return res.status(400).json({error:'Вкажіть логін і пароль'});
  const db=getDB(), a=db.prepare('SELECT * FROM admins WHERE username=?').get(username);
  if (!a||!bcrypt.compareSync(password,a.password_hash)) return res.status(401).json({error:'Невірний логін або пароль'});
  res.json({token:jwt.sign({id:a.id,username:a.username},SECRET,{expiresIn:'7d'}),username:a.username});
});

r.post('/change-password', auth, (req,res) => {
  const {current_password,new_password} = req.body;
  if (!current_password||!new_password) return res.status(400).json({error:'Заповніть обидва поля'});
  const db=getDB(), a=db.prepare('SELECT * FROM admins WHERE id=?').get(req.admin.id);
  if (!bcrypt.compareSync(current_password,a.password_hash)) return res.status(401).json({error:'Невірний поточний пароль'});
  db.prepare('UPDATE admins SET password_hash=? WHERE id=?').run(bcrypt.hashSync(new_password,10),req.admin.id);
  res.json({success:true});
});

module.exports = r;
