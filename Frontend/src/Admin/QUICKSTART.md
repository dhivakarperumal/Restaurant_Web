# Quick Start Guide - AddAlbum Component

## 🚀 Quick Navigation

### File Location
```
Frontend/src/Admin/AddAlbum.jsx
```

### Access Points
- **Create:** `http://localhost:5173/#/admin/albums/add`
- **Edit:** `http://localhost:5173/#/admin/albums/add?edit=ALB001`
- **View:** `http://localhost:5173/#/admin/albums/add?view=ALB001`

---

## 📋 Form Sections at a Glance

| Section | Purpose | Key Fields |
|---------|---------|-----------|
| Basic Information | Core product details | Name, Code, Category, Brand, Type |
| Product Colors | Color variants | Color name + Hex code picker |
| Product Sizes | Size options | Size input (S, M, L, etc.) |
| Pricing Details | Price structure | MRP, Offer Price, Auto Discount% |
| Product Images | Visual assets | Thumbnail + Gallery (10 max) |
| Product Variants | Color/Size combos | Color + Size + Price + Stock + Image |
| Album Details | Album specifics | Occasion, Theme, Cover info |
| Pages Information | Page details | Total Pages, Sheet count, Material |
| Size & Dimensions | Physical size | Width, Height, Orientation |
| Stock Information | Inventory | Quantity, Min Stock, Status |
| Customization | Features | Checkboxes for features |
| Description | Content | Short + Long descriptions |
| SEO Details | Meta tags | Title, Description |

---

## 🎯 Key Features

### Colors Section
```javascript
// Add color via UI
Color Name: Red
Hex Code: #FF0000
→ Displays as: 🔴 Red (#FF0000)

// Data structure
colors: [
  { name: "Red", code: "#FF0000" },
  { name: "Blue", code: "#0000FF" }
]
```

### Sizes Section
```javascript
// Add size via UI
Size Input: "M"
→ Displays as tag: M [×]

// Data structure
sizes: ["S", "M", "L", "XL", "12 x 18 Inches"]
```

### Pricing Section
```javascript
// Fill in:
MRP: 1200
Offer Price: 999
→ Auto-calculates: Discount = 17%

// Data sent to API
mrp: 1200,
offerPrice: 999,
discountPercentage: 17,
costPrice: 800
```

### Variants Section
```javascript
// Each variant can have:
Color: Red (dropdown from colors list)
Size: M (dropdown from sizes list)
MRP: 1999
Offer Price: 1499
Stock: 10
SKU: PROD-RED-M
Image: (upload)

// Data structure
variants: [
  {
    id: 1694174800000,
    color: "Red",
    size: "M",
    mrp: 1999,
    offerPrice: 1499,
    stock: 10,
    sku: "PROD-RED-M",
    image: "https://..."
  }
]
```

### Images Section
```
Thumbnail: 1 image (main product image)
Gallery: Up to 10 images (product showcase)
Variant Images: 1 per variant (color/size specific)

Each with: Preview + Replace + Delete buttons
```

---

## 🔄 Form Workflow

### Step-by-Step to Create Album

1. **Go to:** `/admin/albums/add`
2. **Fill Basic Info:** Name, Code, Category
3. **Add Colors:**
   - Enter color name (e.g., "Red")
   - Pick hex code from color picker
   - Click "Add Color"
   - Repeat for all colors
4. **Add Sizes:**
   - Enter size (e.g., "M")
   - Click "Add Size"
   - Repeat for all sizes
5. **Set Pricing:**
   - Enter MRP (list price)
   - Enter Offer Price (selling price)
   - Discount % auto-calculates
6. **Upload Images:**
   - Upload thumbnail (main image)
   - Upload gallery images (multi-select)
7. **Add Variants:**
   - Click "Add Variant"
   - Select color, size
   - Enter variant MRP, Offer Price
   - Enter stock quantity
   - Enter SKU
   - Optional: Upload variant image
   - Repeat for all variants
8. **Fill Details:**
   - Album details (occasion, theme, etc.)
   - Pages info (pages, material, etc.)
   - Size & dimensions
   - Stock info
   - Customization options (checkboxes)
   - Description (short + long)
   - SEO details
9. **Save:** Click "Save Album" button

---

## 🛠️ API Integration

### Create Album
```
POST /albums
Body: {
  product_name: string,
  product_code: string,
  category: string,
  mrp: number,
  offer_price: number,
  discount_percentage: number,
  colors: [{name, code}],
  sizes: [string],
  variants: [{color, size, mrp, offerPrice, stock, sku, image}],
  product_images: [string],
  ... other fields
}
```

### Update Album
```
PUT /albums/{albumId}
Body: (same as create)
```

### Fetch Album
```
GET /albums/{albumId}
Returns: full album object with all fields
```

---

## ⚙️ Customization Options

### Change Primary Color
Replace `#1a3c36` with your color:
- Button: `bg-[#1a3c36]`
- Button hover: `hover:bg-[#214a42]`
- Input focus: `focus:border-[#1a3c36]`

### Change Image Limits
- Thumbnail max: Keep as 1
- Gallery max: Change `productImages.slice(0, 10)` to desired number
- Variant images: Keep as 1 per variant

### Add New Fields
1. Add to `albumProduct` default object
2. Add state handler in `handleChange`
3. Add input in JSX form
4. Add to API payload in `handleSubmit`

---

## 🐛 Common Issues & Solutions

### Issue: Discount not calculating
**Solution:** Make sure both MRP and Offer Price are filled in and are numbers

### Issue: Color not showing in variant dropdown
**Solution:** Add color to Product Colors section first

### Issue: Size not showing in variant dropdown
**Solution:** Add size to Product Sizes section first

### Issue: Image upload fails
**Solution:** Check file size, format, and API endpoint `/upload` is working

### Issue: Variant not expanding
**Solution:** Click the variant card row (not button area) to expand

### Issue: Form not submitting
**Solution:** Check browser console for errors, ensure required fields are filled

---

## 📱 Responsive Breakpoints

- **Mobile (< 768px):** 1 column, compact cards
- **Tablet (768px - 1024px):** 2 columns, medium spacing
- **Desktop (> 1024px):** 3 columns, full spacing

---

## 🎨 Color Palette Used

```
Primary Teal:    #1a3c36  (buttons, accents)
Hover Teal:      #214a42  (button hover)
Background Gray: #f3f4f6  (page background)
Card Background: #faf9f8  (form sections)
Border Color:    #e7e0d8  (card borders)
Text Primary:    #2d2d2d  (labels, text)
Text Secondary:  #777     (helper text)
Text Tertiary:   #646464  (breadcrumb text)
Error Red:       #b42318  (delete buttons)
Success Teal:    #1a3c36  (primary actions)
```

---

## ✅ Validation Rules

- **Product Name:** Required
- **Product Code:** Required
- **Category:** Required
- **MRP:** Must be number > 0
- **Offer Price:** Must be number > 0
- **Colors:** Color name required, code optional (defaults to black)
- **Sizes:** Size text required
- **Images:** File type must be image/*
- **Variants:** At least color and size recommended

---

## 📊 Performance Tips

1. Don't upload images larger than 5MB each
2. Limit gallery to 10 images for faster loading
3. Use descriptive SKUs for easy tracking
4. Test on mobile devices periodically
5. Monitor API response times for bulk updates

---

## 🔐 Security Notes

- Image uploads go through `/upload` API endpoint
- All data validated before sending to backend
- Form data stored in component state (not localStorage)
- Edit/View modes properly controlled via URL params
- API calls use authenticated axios instance

---

## 📞 Need Help?

Refer to `ADDALBUM_DOCUMENTATION.md` in the same directory for detailed documentation.

All files are located in: `Frontend/src/Admin/`
