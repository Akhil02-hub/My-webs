from pathlib import Path
import shutil
import re

ROOT = Path.cwd()
FRONTEND = ROOT / 'frontend'
MAIN = ROOT / 'main.py'
ADMIN = FRONTEND / 'admin.html'
SCRIPT = FRONTEND / 'script.js'
STYLE = FRONTEND / 'style.css'
INDEX = FRONTEND / 'index.html'

if not MAIN.exists() or not FRONTEND.exists():
    raise SystemExit('Run this script from the folder that contains main.py and the frontend folder.')

backup = ROOT / 'backup_before_admin_upgrade'
backup.mkdir(exist_ok=True)
for p in [MAIN, ADMIN, SCRIPT, STYLE, INDEX]:
    if p.exists():
        shutil.copy2(p, backup / p.name)

# ---------- main.py ----------
main = MAIN.read_text(encoding='utf-8')

# Add gallery + site settings tables inside init_db if missing.
if 'CREATE TABLE IF NOT EXISTS gallery_items' not in main:
    init_start = main.find('def init_db():')
    init_call = main.find('\ninit_db()', init_start)
    if init_start == -1 or init_call == -1:
        raise SystemExit('Could not locate init_db() in main.py')
    init_block = main[init_start:init_call]
    marker = '    conn.commit()\n    conn.close()'
    if marker not in init_block:
        raise SystemExit('Could not locate the end of init_db() in main.py')
    extra_tables = '''\n\n    # Gallery and editable site content\n    cursor.execute(''' + "'''" + '''\n        CREATE TABLE IF NOT EXISTS gallery_items (\n            id INTEGER PRIMARY KEY AUTOINCREMENT,\n            label TEXT DEFAULT '',\n            category TEXT DEFAULT 'Food',\n            image TEXT NOT NULL,\n            created_at TEXT DEFAULT CURRENT_TIMESTAMP\n        )\n    ''' + "'''" + ''')\n\n    cursor.execute(''' + "'''" + '''\n        CREATE TABLE IF NOT EXISTS site_settings (\n            key TEXT PRIMARY KEY,\n            value TEXT\n        )\n    ''' + "'''" + ''')\n'''
    init_block = init_block.replace(marker, extra_tables + '\n' + marker, 1)
    main = main[:init_start] + init_block + main[init_call:]

# Add gallery/about API before static frontend mount.
if '@app.get("/api/gallery")' not in main:
    api_block = r'''

# ---------- Gallery endpoints ----------
class GalleryCreate(BaseModel):
    label: str = ""
    category: str = "Food"
    image: str

@app.get("/api/gallery")
async def get_gallery():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM gallery_items ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/api/gallery")
async def add_gallery_item(item: GalleryCreate):
    if not item.image:
        raise HTTPException(status_code=400, detail="Image is required")
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO gallery_items (label, category, image) VALUES (?, ?, ?)",
        (item.label, item.category, item.image),
    )
    conn.commit()
    new_id = cur.lastrowid
    row = conn.execute("SELECT * FROM gallery_items WHERE id = ?", (new_id,)).fetchone()
    conn.close()
    return dict(row)

@app.delete("/api/gallery/{item_id}")
async def delete_gallery_item(item_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM gallery_items WHERE id = ?", (item_id,))
    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Gallery image not found")
    conn.commit()
    conn.close()
    return {"message": "deleted"}


# ---------- About Us photo ----------
class AboutImageUpdate(BaseModel):
    image: Optional[str] = None

@app.get("/api/about-image")
async def get_about_image():
    conn = get_db_connection()
    row = conn.execute("SELECT value FROM site_settings WHERE key = 'about_image'").fetchone()
    conn.close()
    return {"image": row["value"] if row else ""}

@app.put("/api/about-image")
async def set_about_image(update: AboutImageUpdate):
    conn = get_db_connection()
    conn.execute(
        "INSERT INTO site_settings (key, value) VALUES ('about_image', ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (update.image or "",),
    )
    conn.commit()
    conn.close()
    return {"image": update.image or ""}
'''
    mount_marker = 'from fastapi.staticfiles import StaticFiles'
    if mount_marker in main:
        main = main.replace(mount_marker, api_block + '\n' + mount_marker, 1)
    else:
        main += api_block

MAIN.write_text(main, encoding='utf-8')

# ---------- admin.html ----------
admin_html = r'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Foodies | Admin Dashboard</title>
<link rel="stylesheet" href="style.css">
<style>
  body{background:#f8f0e6}.admin-wrap{max-width:1150px;margin:auto;padding:30px 20px 70px}
  .admin-header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:24px}
  .panel{background:#fff;border-radius:14px;padding:22px;margin-bottom:24px;box-shadow:0 4px 16px rgba(0,0,0,.07)}
  .panel h3{color:var(--maroon);margin-bottom:16px}
  .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
  .full{grid-column:1/-1}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .upload-box{width:140px;height:110px;border:2px dashed #d8c7b6;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#fbf5ed}
  .upload-box img{width:100%;height:100%;object-fit:cover}.preview{width:56px;height:56px;object-fit:cover;border-radius:8px}
  .check-row{display:flex;gap:18px;flex-wrap:wrap;align-items:center;margin:8px 0}.check-row label{margin:0;display:flex;gap:6px;align-items:center}
  table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #eee;text-align:left;font-size:.88rem}th{color:var(--maroon);background:#fbf5ed}
  .btn-sm{padding:6px 10px;border:0;border-radius:7px;cursor:pointer}.btn-red{background:#c62828;color:#fff}.btn-gold{background:var(--gold);color:var(--dark)}.btn-green{background:#2e7d32;color:#fff}
  .gallery-grid-admin{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px}.gallery-admin-card{background:#fff4e9;border-radius:10px;overflow:hidden}.gallery-admin-card img{width:100%;height:130px;object-fit:cover}.gallery-admin-card .body{padding:9px}.muted{color:#7b6b5d;font-size:.82rem}.empty{color:#8a7a6d;text-align:center;padding:18px}
  @media(max-width:600px){.upload-box{width:100%;height:150px}.form-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="admin-wrap">
  <div class="admin-header"><div><h2>Foodies Admin Dashboard</h2><div class="muted">Manage Menu, Signature Favourites, Gallery and About Us</div></div><a href="/" class="btn-primary">View Website</a></div>

  <div class="panel">
    <h3>1. Our Menu + Signature Favourites</h3>
    <form id="menu-form">
      <input type="hidden" id="menu-id">
      <div class="form-grid">
        <label>Name<input id="menu-name" required></label>
        <label>Category<input id="menu-category" required></label>
        <label>Price (₹)<input id="menu-price" type="number" min="0" step="1" required></label>
        <label>Description<input id="menu-description"></label>
      </div>
      <div class="check-row">
        <label><input id="menu-veg" type="checkbox" checked> Veg</label>
        <label><input id="menu-popular" type="checkbox"> Popular / Signature Favourite</label>
        <label><input id="menu-chef" type="checkbox"> Chef Special / Signature Favourite</label>
        <label><input id="menu-available" type="checkbox" checked> Available</label>
      </div>
      <div style="margin:12px 0">
        <div class="upload-box" onclick="menuImageInput.click()"><img id="menu-image-preview" style="display:none"><span id="menu-image-placeholder">📷 Upload menu photo</span></div>
        <input id="menu-image-input" type="file" accept="image/*" hidden>
      </div>
      <div class="actions"><button class="btn-primary" type="submit" id="menu-save">Add Menu Item</button><button class="btn-sm" type="button" onclick="resetMenuForm()">Clear</button></div>
    </form>
  </div>

  <div class="panel"><h3>Menu Items</h3><table><thead><tr><th>Photo</th><th>Name</th><th>Category</th><th>Price</th><th>Favourite</th><th>Status</th><th>Actions</th></tr></thead><tbody id="menu-list"></tbody></table></div>

  <div class="panel">
    <h3>2. Gallery</h3>
    <form id="gallery-form">
      <div class="form-grid">
        <label>Label<input id="gallery-label" placeholder="Restaurant / Food / Event"></label>
        <label>Category<select id="gallery-category"><option>Food</option><option>Cakes</option><option>Bakery</option><option>Restaurant</option></select></label>
      </div>
      <div style="margin:12px 0"><div class="upload-box" onclick="galleryImageInput.click()"><img id="gallery-image-preview" style="display:none"><span id="gallery-image-placeholder">📷 Upload gallery photo</span></div><input id="gallery-image-input" type="file" accept="image/*" hidden></div>
      <button class="btn-primary" type="submit">Add Gallery Photo</button>
    </form>
    <div class="gallery-grid-admin" id="gallery-list" style="margin-top:18px"></div>
  </div>

  <div class="panel">
    <h3>3. About Us Photo</h3>
    <div class="upload-box" onclick="aboutImageInput.click()"><img id="about-image-preview" style="display:none"><span id="about-image-placeholder">📷 Upload / Replace About Us photo</span></div>
    <input id="about-image-input" type="file" accept="image/*" hidden>
    <div class="actions"><button class="btn-primary" onclick="saveAboutImage()">Save About Us Photo</button><button class="btn-sm" onclick="removeAboutImage()">Remove Photo</button></div>
    <p id="about-status" class="muted"></p>
  </div>

  <div class="panel"><h3>Bookings</h3><table><thead><tr><th>Name</th><th>Phone</th><th>Guests</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead><tbody id="booking-list"></tbody></table></div>
  <div class="panel"><h3>Reviews</h3><table><thead><tr><th>Name</th><th>Rating</th><th>Comment</th><th>Actions</th></tr></thead><tbody id="review-list"></tbody></table></div>
</div>

<script>
const API='';
let menuImageData='', galleryImageData='', aboutImageData='', menuCache=[];
const menuImageInput=document.getElementById('menu-image-input');
const galleryImageInput=document.getElementById('gallery-image-input');
const aboutImageInput=document.getElementById('about-image-input');
function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
function setPreview(imgId, placeholderId, data){const img=document.getElementById(imgId), ph=document.getElementById(placeholderId);if(data){img.src=data;img.style.display='block';ph.style.display='none'}else{img.removeAttribute('src');img.style.display='none';ph.style.display='inline'}}
menuImageInput.addEventListener('change',async e=>{menuImageData=e.target.files[0]?await fileToDataURL(e.target.files[0]):'';setPreview('menu-image-preview','menu-image-placeholder',menuImageData)});
galleryImageInput.addEventListener('change',async e=>{galleryImageData=e.target.files[0]?await fileToDataURL(e.target.files[0]):'';setPreview('gallery-image-preview','gallery-image-placeholder',galleryImageData)});
aboutImageInput.addEventListener('change',async e=>{aboutImageData=e.target.files[0]?await fileToDataURL(e.target.files[0]):'';setPreview('about-image-preview','about-image-placeholder',aboutImageData)});
async function loadMenu(){const r=await fetch(`${API}/api/menu`);menuCache=await r.json();document.getElementById('menu-list').innerHTML=menuCache.map(i=>`<tr><td>${i.image?`<img class="preview" src="${i.image}">`:''}</td><td>${i.name}</td><td>${i.category}</td><td>₹${i.price}</td><td>${i.popular||i.chef_special?'Yes':'No'}</td><td>${i.available?'Available':'Unavailable'}</td><td><button class="btn-sm btn-gold" onclick="editMenu(${i.id})">Edit</button> <button class="btn-sm btn-red" onclick="deleteMenu(${i.id})">Delete</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No menu items yet.</td></tr>'}
function resetMenuForm(){document.getElementById('menu-form').reset();document.getElementById('menu-id').value='';document.getElementById('menu-veg').checked=true;document.getElementById('menu-available').checked=true;menuImageData='';setPreview('menu-image-preview','menu-image-placeholder','');document.getElementById('menu-save').textContent='Add Menu Item'}
function editMenu(id){const i=menuCache.find(x=>x.id===id);if(!i)return;document.getElementById('menu-id').value=i.id;document.getElementById('menu-name').value=i.name;document.getElementById('menu-category').value=i.category;document.getElementById('menu-price').value=i.price;document.getElementById('menu-description').value=i.description||'';document.getElementById('menu-veg').checked=!!i.veg;document.getElementById('menu-popular').checked=!!i.popular;document.getElementById('menu-chef').checked=!!i.chef_special;document.getElementById('menu-available').checked=!!i.available;menuImageData=i.image||'';setPreview('menu-image-preview','menu-image-placeholder',menuImageData);document.getElementById('menu-save').textContent='Save Changes';window.scrollTo({top:0,behavior:'smooth'})}
document.getElementById('menu-form').addEventListener('submit',async e=>{e.preventDefault();const id=document.getElementById('menu-id').value;const old=menuCache.find(x=>x.id==id);const data={name:document.getElementById('menu-name').value,category:document.getElementById('menu-category').value,description:document.getElementById('menu-description').value,price:Number(document.getElementById('menu-price').value),veg:document.getElementById('menu-veg').checked,popular:document.getElementById('menu-popular').checked,chef_special:document.getElementById('menu-chef').checked,available:document.getElementById('menu-available').checked,image:menuImageData};const url=id?`${API}/api/menu/${id}`:`${API}/api/menu`;await fetch(url,{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});resetMenuForm();loadMenu()});
async function deleteMenu(id){if(!confirm('Delete this menu item?'))return;await fetch(`${API}/api/menu/${id}`,{method:'DELETE'});loadMenu()}
async function loadGallery(){const r=await fetch(`${API}/api/gallery`);const items=await r.json();document.getElementById('gallery-list').innerHTML=items.map(i=>`<div class="gallery-admin-card"><img src="${i.image}"><div class="body"><b>${i.label||'Photo'}</b><div class="muted">${i.category}</div><button class="btn-sm btn-red" style="margin-top:7px" onclick="deleteGallery(${i.id})">Delete</button></div></div>`).join('')||'<div class="empty">No gallery photos yet.</div>'}
document.getElementById('gallery-form').addEventListener('submit',async e=>{e.preventDefault();if(!galleryImageData){alert('Please choose a gallery image.');return}await fetch(`${API}/api/gallery`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:document.getElementById('gallery-label').value,category:document.getElementById('gallery-category').value,image:galleryImageData})});galleryImageData='';document.getElementById('gallery-form').reset();setPreview('gallery-image-preview','gallery-image-placeholder','');loadGallery()});
async function deleteGallery(id){if(!confirm('Delete this gallery photo?'))return;await fetch(`${API}/api/gallery/${id}`,{method:'DELETE'});loadGallery()}
async function loadAboutImage(){const r=await fetch(`${API}/api/about-image`);const d=await r.json();aboutImageData=d.image||'';setPreview('about-image-preview','about-image-placeholder',aboutImageData)}
async function saveAboutImage(){await fetch(`${API}/api/about-image`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:aboutImageData})});document.getElementById('about-status').textContent='About Us photo saved.'}
async function removeAboutImage(){aboutImageData='';await saveAboutImage();setPreview('about-image-preview','about-image-placeholder','')}
async function loadBookings(){const r=await fetch(`${API}/api/bookings`);const items=await r.json();document.getElementById('booking-list').innerHTML=items.map(b=>`<tr><td>${b.name}</td><td>${b.phone}</td><td>${b.guests}</td><td>${b.date}</td><td>${b.time}</td><td>${b.status}</td><td><button class="btn-sm btn-green" onclick="setBooking(${b.id},'Confirmed')">Confirm</button> <button class="btn-sm btn-red" onclick="setBooking(${b.id},'Cancelled')">Cancel</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No bookings.</td></tr>'}
async function setBooking(id,status){await fetch(`${API}/api/bookings/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});loadBookings()}
async function loadReviews(){const r=await fetch(`${API}/api/reviews`);const items=await r.json();document.getElementById('review-list').innerHTML=items.map(x=>`<tr><td>${x.name}</td><td>${'★'.repeat(x.rating)}</td><td>${x.comment||''}</td><td><button class="btn-sm btn-red" onclick="deleteReview(${x.id})">Delete</button></td></tr>`).join('')||'<tr><td colspan="4" class="empty">No reviews.</td></tr>'}
async function deleteReview(id){if(!confirm('Delete this review?'))return;await fetch(`${API}/api/reviews/${id}`,{method:'DELETE'});loadReviews()}
loadMenu();loadGallery();loadAboutImage();loadBookings();loadReviews();
</script>
</body>
</html>
'''
ADMIN.write_text(admin_html, encoding='utf-8')

# ---------- script.js ----------
script = SCRIPT.read_text(encoding='utf-8')
# Make existing menu/featured image placeholders render actual uploaded images.
script = script.replace(
    "<div class=\"card-image\">${item.image || '🍽️'}</div>",
    "<div class=\"card-image\">${item.image ? `<img src=\"${item.image}\" alt=\"${item.name}\">` : '🍽️'}</div>"
)
script = script.replace(
    "${item.image || '🍽️'}",
    "${item.image ? `<img src=\"${item.image}\" alt=\"${item.name}\">` : '🍽️'}"
)

# Override gallery and add About Us loading. Function declarations here replace older definitions at runtime.
addon = r'''

// ---------- Admin-managed Gallery + About Us ----------
async function setupGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    try {
        const res = await fetch(`${API}/api/gallery`);
        const items = await res.json();
        if (!Array.isArray(items) || items.length === 0) {
            grid.innerHTML = `<p class="menu-empty">No gallery photos yet.</p>`;
            return;
        }
        grid.innerHTML = items.map((item, idx) => `
            <div class="gallery-item" data-index="${idx}" data-category="${item.category}">
                <img src="${item.image}" alt="${item.label || 'Foodies gallery'}" loading="lazy">
                <div class="gallery-label">${item.label || ''}</div>
            </div>
        `).join('');
        grid.querySelectorAll('.gallery-item').forEach((el) => {
            el.addEventListener('click', () => {
                const image = el.querySelector('img');
                const box = document.getElementById('lightbox');
                const lightboxImg = document.getElementById('lightboxImage');
                if (box && lightboxImg && image) { lightboxImg.src = image.src; box.classList.add('active'); }
            });
        });
        const tabs = document.querySelectorAll('.gallery-tab');
        tabs.forEach(tab => tab.onclick = () => {
            const cat = tab.dataset.category;
            grid.querySelectorAll('.gallery-item').forEach(el => { el.style.display = (cat === 'all' || el.dataset.category === cat) ? '' : 'none'; });
            tabs.forEach(t => t.classList.toggle('active', t === tab));
        });
    } catch (e) {
        grid.innerHTML = `<p class="menu-empty">Could not load gallery.</p>`;
    }
}

async function loadAboutImage() {
    const box = document.querySelector('.about-image');
    if (!box) return;
    try {
        const res = await fetch(`${API}/api/about-image`);
        const data = await res.json();
        if (data.image) {
            box.innerHTML = `<img src="${data.image}" alt="About Foodies" loading="lazy">`;
        }
    } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    loadAboutImage();
    setupGallery();
});
'''
if 'Admin-managed Gallery + About Us' not in script:
    script += addon
SCRIPT.write_text(script, encoding='utf-8')

# ---------- style.css ----------
style = STYLE.read_text(encoding='utf-8')
extra_css = r'''
/* Admin-managed images */
.card-image { overflow: hidden; }
.card-image img, .featured-card .card-image img, .menu-card .card-image img { width:100%; height:100%; object-fit:cover; display:block; }
.about-image { overflow:hidden; }
.about-image img { width:100%; height:100%; object-fit:cover; display:block; border-radius:inherit; }
.gallery-grid .gallery-item img { width:100%; height:100%; object-fit:cover; display:block; }
'''
if '/* Admin-managed images */' not in style:
    style += '\n' + extra_css
STYLE.write_text(style, encoding='utf-8')

print('Upgrade completed successfully.')
print(f'Backups saved in: {backup}')
print('Modified: main.py, frontend/admin.html, frontend/script.js, frontend/style.css')
print('No changes were made to your existing dhaba.db data.')
