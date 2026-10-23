const fs = require('fs');
const p = 'Frontend/src/Admin/AdminDashboardOverview.jsx';
let c = fs.readFileSync(p, 'utf8');

const targetOld = `<article className="min-w-0 border border-slate-200/80 bg-white shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] rounded-xl border-slate-200/90 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-800 sm:text-base">Quick Actions</h2><button type="button" onClick={() => navigate('/admin')} className="text-[10px] font-medium text-[#66756b] hover:text-[#178a36]">View All <ArrowRight size={11} className="ml-1 inline" /></button></div>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(({ label, icon: Icon, path, tone, surface }) => <button type="button" key={label} onClick={() => navigate(path)} className=\`flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-md border px-2 py-2 text-center text-white transition hover:shadow-sm \${surface}\`}>
              <span className=\`grid h-10 w-10 place-items-center rounded-full \${tone}\`}><Icon size={20} /></span><span className="text-[10px] font-semibold text-white">{label}</span>
            </button>)}
          </div>
        </article>`;

const targetNew = `<article className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-800">Quick Actions</h2>
              <p className="text-xs text-slate-400">Essential navigation shortcuts</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map(({ label, icon: Icon, path, bg, iconBg }) => (
              <button
                type="button"
                key={label}
                onClick={() => navigate(path)}
                className={\`group relative flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-3 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md \${bg}\`}
              >
                <div className={\`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-110 \${iconBg}\`}>
                  <Icon size={19} strokeWidth={2.3} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-800 group-hover:text-slate-900">
                    {label}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 group-hover:text-orange-500 flex items-center gap-0.5">
                    Open <ArrowRight size={9} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </article>`;

if (c.includes(targetOld)) {
  c = c.replace(targetOld, targetNew);
  fs.writeFileSync(p, c, 'utf8');
  console.log('REPLACED_EXACT');
} else {
  // Regex replacement for quick actions article
  const articleRegex = /<article[^>]*>[\s\S]*?<h2[^>]*>Quick Actions<\/h2>[\s\S]*?<\/article>/;
  c = c.replace(articleRegex, targetNew);
  fs.writeFileSync(p, c, 'utf8');
  console.log('REPLACED_REGEX');
}
