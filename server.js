require("dotenv").config();
const express=require("express"),path=require("path"),fs=require("fs"),crypto=require("crypto");
const helmet=require("helmet"),rateLimit=require("express-rate-limit"),Database=require("better-sqlite3");
const app=express(),PORT=process.env.PORT||3000,ADMIN_PASSWORD=process.env.ADMIN_PASSWORD,SECRET=process.env.SESSION_SECRET;
if(!ADMIN_PASSWORD||ADMIN_PASSWORD.length<12||!SECRET||SECRET.length<24){console.error("Set ADMIN_PASSWORD (12+ chars) and SESSION_SECRET (24+ chars) in .env");process.exit(1)}
app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:"30kb"}));app.use(express.static(path.join(__dirname,"public")));
app.use("/api/",rateLimit({windowMs:15*60*1000,limit:100,standardHeaders:true,legacyHeaders:false}));
fs.mkdirSync(path.join(__dirname,"data"),{recursive:true});const db=new Database(path.join(__dirname,"data","foodexpress.sqlite"));db.pragma("journal_mode=WAL");
db.exec(`CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY,code TEXT UNIQUE,name TEXT,phone TEXT,address TEXT,notes TEXT,items TEXT,subtotal INTEGER,delivery INTEGER,total INTEGER,status TEXT,payment TEXT,created TEXT)`);
const menu=[
{id:1,name:"पिज़्ज़ा",emoji:"🍕",price:199,desc:"चीज़ और स्वादिष्ट टॉपिंग"},
{id:2,name:"बर्गर",emoji:"🍔",price:99,desc:"कुरकुरा पैटी और ताज़ी सब्ज़ियाँ"},
{id:3,name:"वेज बिरयानी",emoji:"🍛",price:149,desc:"मसालों से भरपूर"},
{id:4,name:"मोमोज",emoji:"🥟",price:79,desc:"गरमागरम मोमोज, चटनी के साथ"},
{id:5,name:"सैंडविच",emoji:"🥪",price:89,desc:"ताज़ी सब्ज़ियों वाला सैंडविच"},
{id:6,name:"आइसक्रीम",emoji:"🍨",price:59,desc:"मीठी और ठंडी मिठाई"},
{id:7,name:"फ्रेंच फ्राइज़",emoji:"🍟",price:69,desc:"कुरकुरे गोल्डन फ्राइज़"},
{id:8,name:"डोसा",emoji:"🥞",price:119,desc:"क्रिस्पी डोसा, सांभर के साथ"}];
const sessions=new Map(),token=()=>crypto.randomBytes(32).toString("hex");
function admin(req,res,next){const t=req.get("x-admin-token");if(!t||!sessions.has(t)||sessions.get(t)<Date.now())return res.status(401).json({error:"एडमिन में दोबारा लॉगिन करें।"});next()}
app.get("/api/health",(q,s)=>s.json({ok:true}));app.get("/api/menu",(q,s)=>s.json(menu));
app.post("/api/orders",(req,res)=>{const b=req.body||{},name=b.customerName,phone=b.phone,address=b.address,notes=b.notes||"";
if(typeof name!=="string"||name.trim().length<2||name.length>80)return res.status(400).json({error:"सही नाम लिखें।"});
if(typeof phone!=="string"||!/^[0-9+\-\s]{10,15}$/.test(phone.trim()))return res.status(400).json({error:"सही मोबाइल नंबर लिखें।"});
if(typeof address!=="string"||address.trim().length<8||address.length>500)return res.status(400).json({error:"पूरा पता लिखें।"});
if(typeof notes!=="string"||notes.length>200)return res.status(400).json({error:"निर्देश बहुत लंबे हैं।"});
if(!Array.isArray(b.items)||!b.items.length||b.items.length>30)return res.status(400).json({error:"कार्ट में खाना जोड़ें।"});
const items=[];for(const x of b.items){const f=menu.find(m=>m.id===Number(x.id)),n=Number(x.quantity);if(!f||!Number.isInteger(n)||n<1||n>20)return res.status(400).json({error:"गलत आइटम या मात्रा।"});const old=items.find(i=>i.id===f.id);if(old)old.quantity+=n;else items.push({id:f.id,name:f.name,quantity:n,unitPrice:f.price})}
if(items.some(i=>i.quantity>20))return res.status(400).json({error:"एक आइटम की अधिकतम मात्रा 20 है।"});
const subtotal=items.reduce((s,i)=>s+i.unitPrice*i.quantity,0),delivery=subtotal>=299?0:30,total=subtotal+delivery,code="FE"+Date.now().toString().slice(-8)+crypto.randomInt(10,99),created=new Date().toISOString();
db.prepare("INSERT INTO orders(code,name,phone,address,notes,items,subtotal,delivery,total,status,payment,created) VALUES(?,?,?,?,?,?,?,?,?,'Received','Cash on delivery',?)").run(code,name.trim(),phone.trim(),address.trim(),notes.trim(),JSON.stringify(items),subtotal,delivery,total,created);
res.status(201).json({success:true,orderCode:code,subtotal,delivery,total,status:"Received",message:"ऑर्डर दर्ज हो गया; एडमिन पैनल में दिखाई देगा।"})});
app.post("/api/admin/login",(req,res)=>{const p=req.body&&req.body.password;if(typeof p!=="string"||p.length>200)return res.status(400).json({error:"पासवर्ड दर्ज करें।"});const a=Buffer.from(p),b=Buffer.from(ADMIN_PASSWORD);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(401).json({error:"पासवर्ड सही नहीं है।"});const t=token();sessions.set(t,Date.now()+8*60*60*1000);res.json({token:t})});
app.get("/api/admin/orders",admin,(req,res)=>res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 500").all().map(o=>({...o,items:JSON.parse(o.items),items_json:undefined}))));
app.patch("/api/admin/orders/:id/status",admin,(req,res)=>{const allowed=["Received","Preparing","Out for delivery","Delivered","Cancelled"],s=req.body&&req.body.status;if(!allowed.includes(s))return res.status(400).json({error:"गलत स्टेटस"});const r=db.prepare("UPDATE orders SET status=? WHERE id=?").run(s,Number(req.params.id));if(!r.changes)return res.status(404).json({error:"ऑर्डर नहीं मिला"});res.json({success:true})});
app.post("/api/admin/logout",admin,(req,res)=>{sessions.delete(req.get("x-admin-token"));res.json({success:true})});
app.get("/admin",(q,s)=>s.sendFile(path.join(__dirname,"public","admin.html")));app.get("*",(q,s)=>s.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log("FoodExpress running on port "+PORT));
