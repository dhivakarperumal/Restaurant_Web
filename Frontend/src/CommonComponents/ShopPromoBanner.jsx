import { ArrowRight, ChefHat, Heart, Leaf, Sparkles, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';

const bannerContent = {
  fresh: {
    eyebrow: 'Fresh from our kitchen',
    title: 'Good food, made with care.',
    description: 'Thoughtful ingredients and fresh preparation in every order.',
    action: 'Explore the menu',
    icon: Leaf,
  },
  chef: {
    eyebrow: 'A little something special',
    title: 'Find your new favorite.',
    description: 'Discover comforting classics and exciting new flavors.',
    action: 'Meet the menu',
    icon: ChefHat,
  },
  share: {
    eyebrow: 'Gather around the table',
    title: 'Make every meal a moment.',
    description: 'Bring everyone together over dishes made to be enjoyed.',
    action: 'See today’s offers',
    icon: Heart,
  },
};

function ShopPromoBanner({ variant }) {
  const banner = bannerContent[variant];
  if (!banner) return null;

  const Icon = banner.icon;
  const isChef = variant === 'chef';
  const isShare = variant === 'share';

  return (
    <article
      aria-label={banner.eyebrow}
      className={`group relative col-span-full isolate flex min-h-[190px] items-center overflow-hidden rounded-[28px] px-6 py-7 shadow-sm transition duration-300 hover:shadow-lg sm:min-h-[210px] sm:px-10 ${
        isChef
          ? 'bg-[#173b31] text-white'
          : isShare
            ? 'border border-[#f0d6b8] bg-[#fff0dc] text-[#392517]'
            : 'border border-[#e7e4d8] bg-[#f3f5e9] text-[#203129]'
      }`}
    >
      {isChef ? (
        <>
          <span aria-hidden="true" className="absolute -right-8 -top-16 h-56 w-56 rounded-full border border-white/10 sm:right-10 sm:h-72 sm:w-72" />
          <span aria-hidden="true" className="absolute -right-1 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-[#e99a45]/15 blur-2xl sm:right-24 sm:h-52 sm:w-52" />
        </>
      ) : isShare ? (
        <>
          <span aria-hidden="true" className="absolute -right-12 -top-24 h-64 w-64 rounded-full bg-[#e8a15a]/20 sm:right-12 sm:h-80 sm:w-80" />
          <span aria-hidden="true" className="absolute right-8 top-1/2 hidden h-36 w-36 -translate-y-1/2 rotate-12 rounded-[36px] border-2 border-[#e3a66c]/40 sm:block" />
        </>
      ) : (
        <>
          <span aria-hidden="true" className="absolute -right-12 -top-24 h-64 w-64 rounded-full bg-[#dce5c5] sm:right-12 sm:h-80 sm:w-80" />
          <span aria-hidden="true" className="absolute right-16 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full border-2 border-[#cad7ad] sm:block" />
        </>
      )}

      <div className="relative z-10 max-w-2xl">
        <div className={`mb-3 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] sm:text-xs ${
          isChef ? 'text-[#f3bb77]' : isShare ? 'text-[#a34f32]' : 'text-[#5f7839]'
        }`}>
          {isShare ? <Sparkles className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
          {banner.eyebrow}
        </div>
        <h3 className={`max-w-xl font-serif text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl ${
          isChef ? 'text-white' : 'text-[#203129]'
        }`}>
          {banner.title}
        </h3>
        <p className={`mt-2 max-w-lg text-sm leading-relaxed sm:text-base ${
          isChef ? 'text-white/75' : 'text-[#6d655d]'
        }`}>
          {banner.description}
        </p>
        <Link
          to={isShare ? '/offers' : '/shop'}
          className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
            isChef
              ? 'bg-[#f0a24b] text-[#1c3028] hover:bg-[#ffc06c]'
              : isShare
                ? 'bg-[#a34f32] text-white hover:bg-[#873d26]'
                : 'bg-[#506a35] text-white hover:bg-[#3d5428]'
          }`}
        >
          {banner.action}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div
        aria-hidden="true"
        className={`absolute right-7 top-1/2 hidden h-28 w-28 -translate-y-1/2 items-center justify-center rounded-full sm:flex lg:right-16 lg:h-36 lg:w-36 ${
          isChef
            ? 'border border-white/15 bg-white/5 text-[#f3bb77]'
            : isShare
              ? 'border border-[#e7c39e] bg-white/60 text-[#a34f32]'
              : 'border border-[#d8e1c4] bg-white/75 text-[#5f7839]'
        }`}
      >
        <Icon className="h-12 w-12 lg:h-16 lg:w-16" strokeWidth={1.4} />
        {isChef && <UtensilsCrossed className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full bg-[#f3bb77] p-2 text-[#173b31]" />}
      </div>
    </article>
  );
}

export default ShopPromoBanner;
