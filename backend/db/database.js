const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// On Railway/Render: use /tmp for writable storage
// Locally: use db/ directory
const DB_PATH = process.env.DB_PATH ||
  (process.env.RAILWAY_ENVIRONMENT || process.env.RENDER
    ? '/tmp/liberty.sqlite'
    : path.join(__dirname, 'liberty.sqlite'));
let db;

class SyncDB {
  constructor(s) { this.s = s; }
  exec(sql) { this.s.run(sql); this._save(); }
  prepare(sql) {
    const self = this;
    return {
      run(...p) {
        self.s.run(sql, p.map(v => v === undefined ? null : v));
        self._save();
        const r = self.s.exec('SELECT last_insert_rowid() as id');
        return { lastInsertRowid: r[0]?.values[0][0] ?? null };
      },
      get(...p) {
        const r = self.s.exec(sql, p.map(v => v === undefined ? null : v));
        if (!r.length || !r[0].values.length) return undefined;
        const o = {}; r[0].columns.forEach((c,i) => o[c] = r[0].values[0][i]); return o;
      },
      all(...p) {
        const r = self.s.exec(sql, p.map(v => v === undefined ? null : v));
        if (!r.length) return [];
        return r[0].values.map(row => { const o={}; r[0].columns.forEach((c,i)=>o[c]=row[i]); return o; });
      }
    };
  }
  _save() { fs.writeFileSync(DB_PATH, Buffer.from(this.s.export())); }
}

async function createDB() {
  const SQL = await initSqlJs();
  const s = fs.existsSync(DB_PATH) ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();
  db = new SyncDB(s);

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,name_en TEXT,icon TEXT DEFAULT '☕',sort_order INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS menu_items(id INTEGER PRIMARY KEY AUTOINCREMENT,category_id INTEGER,name TEXT NOT NULL,name_en TEXT,description TEXT,price INTEGER NOT NULL,image_url TEXT,is_available INTEGER DEFAULT 1,is_featured INTEGER DEFAULT 0,sort_order INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT,email TEXT,message TEXT,status TEXT DEFAULT 'new',created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS reservations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT NOT NULL,date TEXT NOT NULL,time TEXT NOT NULL,guests INTEGER DEFAULT 2,comment TEXT,status TEXT DEFAULT 'pending',created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS gallery(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT,image_url TEXT NOT NULL,sort_order INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT);
  `);

  if (!db.prepare('SELECT id FROM admins WHERE username=?').get('admin')) {
    db.prepare('INSERT INTO admins(username,password_hash) VALUES(?,?)').run('admin', bcrypt.hashSync('liberty2024',10));
  }

  if (!db.prepare('SELECT COUNT(*) as c FROM categories').get().c) {
    [['Еспресо','Espresso','☕',1],['Альтернатива','Alternative','🌿',2],['Сигнатури','Signatures','✨',3],
     ['Чай','Tea','🍵',4],['Їжа','Food','🥐',5],['Десерти','Desserts','🍰',6]]
    .forEach(([n,e,i,s]) => db.prepare('INSERT INTO categories(name,name_en,icon,sort_order) VALUES(?,?,?,?)').run(n,e,i,s));
  }

  if (!db.prepare('SELECT COUNT(*) as c FROM menu_items').get().c) {
    const items = [
      [1,'Еспресо','Espresso','Класичний шот арабіки. Яскравий і насичений.',60,'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&q=85',1,1],
      [1,'Доппіо','Doppio','Подвійний шот. Для тих, хто знає.',75,'https://images.unsplash.com/photo-1580933073521-dc49ac0d4e6a?w=600&q=85',0,2],
      [1,'Американо','Americano','Еспресо з водою. М\'яко і об\'ємно.',70,'https://images.unsplash.com/photo-1551030173-122aabc4489c?w=600&q=85',0,3],
      [1,'Капучіно','Cappuccino','Шот, молоко, піна. Ідеальний баланс.',85,'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=85',1,4],
      [1,'Латте','Latte','Вершкове молоко та еспресо. М\'якість.',90,'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=600&q=85',1,5],
      [1,'Флет Вайт','Flat White','Концентрований еспресо, оксамитова піна.',90,'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&q=85',1,6],
      [1,'Кортадо','Cortado','Еспресо і молоко 1:1. Чисто і точно.',80,'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=85',0,7],
      [1,'Раф','Raf','Вершки, ваніль, еспресо. Ніжний.',100,'https://images.unsplash.com/photo-1534040385115-33dcb3acba5b?w=600&q=85',1,8],
      [1,'Макіато','Macchiato','Еспресо з хмаркою молочної піни.',75,'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=85',0,9],
      [2,'Пуровер V60','Pour Over V60','Ручна фільтрація V60. Прозорий смак.',95,'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=85',1,1],
      [2,'Аеропрес','Aeropress','Аеропрес. Чисте і насичене тіло.',90,'https://images.unsplash.com/photo-1568649929103-28ffbefaca1e?w=600&q=85',0,2],
      [2,'Кемекс','Chemex','Кемекс. Вишукана фільтрація.',110,'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&q=85',1,3],
      [2,'Колд Брю','Cold Brew','Холодна екстракція 18 годин. Гладкий.',95,'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=85',0,4],
      [2,'Нітро Колд Брю','Nitro Cold Brew','Колд брю на азоті. Кремовий.',110,'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=600&q=85',1,5],
      [3,'Liberty Special','Liberty Special','Еспресо, карамель, вершки, морська сіль.',130,'https://images.unsplash.com/photo-1596952954288-16862d37405b?w=600&q=85',1,1],
      [3,'Lavender Latte','Lavender Latte','Лавандовий сироп і ніжна молочна піна.',115,'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&q=85',1,2],
      [3,'Honey Oat Latte','Honey Oat Latte','Вівсяне молоко, мед, подвійний еспресо.',110,'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=600&q=85',1,3],
      [3,'Spiced Chai Latte','Spiced Chai Latte','7 прянощів, молоко, мед.',105,'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&q=85',0,4],
      [4,'Матча Латте','Matcha Latte','Японська матча з вівсяним молоком.',110,'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&q=85',1,1],
      [4,'Масала Чай','Masala Chai','Чай зі спеціями у вершковому молоці.',90,'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&q=85',0,2],
      [4,'Чорний чай','Black Tea','Цейлонський Orange Pekoe. Класика.',65,'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600&q=85',0,3],
      [4,"Трав'яний чай",'Herbal Tea','М\'ята, меліса, чебрець. Без кофеїну.',75,'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=85',0,4],
      [5,'Круасан','Croissant','Свіжоспечений. Хрустка шарувата скоринка.',65,'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=85',1,1],
      [5,'Авокадо Тост','Avocado Toast','Авокадо, яйце пашот, мікрозелень.',185,'https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?w=600&q=85',1,2],
      [5,'Гранола','Granola','Домашня гранола з ягодами і йогуртом.',145,'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=600&q=85',0,3],
      [5,'Яєчня','Scrambled Eggs','Яйця, лосось, руккола. Ситно.',175,'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=85',0,4],
      [6,'Чізкейк Liberty','Liberty Cheesecake','Кремовий чізкейк, журавлиновий кулі.',115,'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=85',1,1],
      [6,'Тірамісу','Tiramisu','Маскарпоне, еспресо, какао. Класика.',120,'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=85',1,2],
      [6,'Брауні','Brownie','Бельгійський шоколад, пекан, карамель.',85,'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=600&q=85',1,3],
      [6,'Кокосовий кекс','Coconut Muffin','Кокос, лимонна глазур. Легкий.',75,'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=85',0,4],
    ];
    items.forEach(([cat,name,name_en,desc,price,img,feat,sort]) =>
      db.prepare('INSERT INTO menu_items(category_id,name,name_en,description,price,image_url,is_featured,sort_order) VALUES(?,?,?,?,?,?,?,?)').run(cat,name,name_en,desc,price,img,feat,sort)
    );
  }

  if (!db.prepare('SELECT COUNT(*) as c FROM settings').get().c) {
    [['cafe_name','Liberty'],['cafe_tagline','Кава. Простір. Свобода.'],['address','вул. Дорошенка, 21, Львів'],
     ['phone','+38 (032) 247-01-01'],['email','hello@liberty.lviv.ua'],['instagram','https://instagram.com/liberty.lviv'],
     ['hours_weekday','Пн–Пт: 08:00 – 22:00'],['hours_weekend','Сб–Нд: 09:00 – 23:00'],
     ['wifi_password','liberty2024'],['about_text','Liberty — місце, де кава стає ритуалом. Найкращі зерна, досконала техніка, атмосфера, в якій хочеться залишитись.']]
    .forEach(([k,v]) => db.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').run(k,v));
  }

  if (!db.prepare('SELECT COUNT(*) as c FROM gallery').get().c) {
    [["Інтер'єр",'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=80',1],
     ['Ранкова кава','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',2],
     ['Бариста','https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',3],
     ['Випічка','https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80',4],
     ['Атмосфера','https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&q=80',5],
     ['Лате-арт','https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&q=80',6]]
    .forEach(([t,u,s]) => db.prepare('INSERT INTO gallery(title,image_url,sort_order) VALUES(?,?,?)').run(t,u,s));
  }

  console.log('✅ Liberty DB ready');
  return db;
}

module.exports = { createDB, getDB: () => db };
