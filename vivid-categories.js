const fs = require('fs');
const p = 'Frontend/src/Admin/AdminDashboardOverview.jsx';
let c = fs.readFileSync(p, 'utf8');

const vividCategorySection = `<section aria-label="Menu categories" className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {loading ? [0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
        )) : categoryTiles.length ? categoryTiles.map((category) => (
          <button
            type="button"
            key={category.name}
            onClick={() => navigate('/admin/products')}
            className="group relative flex flex-col items-center justify-between rounded-2xl border-2 border-slate-200/90 bg-white p-3.5 text-center shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-500 hover:shadow-xl"
          >
            {/* High-Contrast Category Image Frame */}
            <div className="relative mb-2.5 h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-orange-500/20 bg-slate-100 p-0.5 shadow-md transition-all duration-300 group-hover:scale-105 group-hover:border-orange-500 group-hover:shadow-orange-500/30">
              <UtensilsCrossed size={22} className="absolute inset-0 m-auto text-slate-300" />
              <img
                src={imageUrl(category.image)}
                alt={category.name}
                className="relative z-10 h-full w-full rounded-xl object-cover"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
            </div>

            {/* High-Visibility Category Name & Bold Pill Badge */}
            <div className="w-full min-w-0">
              <h4 className="truncate text-xs font-black tracking-tight text-slate-900 group-hover:text-orange-600 transition-colors">
                {category.name}
              </h4>
              <div className="mt-1.5 flex items-center justify-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold text-orange-600 border border-orange-200/60 shadow-xs transition-colors group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500">
                  <span>{category.count}</span>
                  <span className="text-[10px] font-medium opacity-90">{category.count === 1 ? 'item' : 'items'}</span>
                </span>
              </div>
            </div>

            {/* Corner Action Arrow */}
            <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all duration-300 group-hover:bg-orange-500 group-hover:text-white">
              <ArrowRight size={11} className="rotate-[-45deg]" />
            </div>
          </button>
        )) : (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-xs font-medium text-slate-500">
            No visible food categories found.
          </div>
        )}
      </section>`;

const regex = /<section aria-label="Menu categories"[\s\S]*?<\/section>/;
c = c.replace(regex, vividCategorySection);
fs.writeFileSync(p, c, 'utf8');
console.log('VIVID_CATEGORY_SECTION_APPLIED');
