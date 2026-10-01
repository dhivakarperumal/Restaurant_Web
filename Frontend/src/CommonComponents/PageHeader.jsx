import { Link } from "react-router-dom";

const PageHeader = ({
  title,
  background = "/images/pageheader.png",
}) => {
  return (
    <div
      className="relative flex h-[210px] w-full items-end justify-center overflow-hidden text-white sm:h-[235px] md:h-[260px]"
      style={{
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "bottom",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Bottom gold line */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-[#d5a65a]"></div>

      {/* Bottom Content */}
      <div className="relative z-10 w-full px-4 pb-7 text-center sm:pb-8 md:pb-9">
        
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-[#edc783] sm:mb-3">
          Q Frame Studio
        </p>

        <h1 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
          {title}
        </h1>

        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-white/80 sm:mt-3 sm:text-sm">
          <Link
            to="/"
            className="transition hover:text-[#edc783]"
          >
            Home
          </Link>

          <span>/</span>

          <span className="text-white">
            {title}
          </span>
        </div>

      </div>
    </div>
  );
};

export default PageHeader;