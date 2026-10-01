import React from "react";

/**
 * Common SectionTitle Component
 * Standardized title layout across all pages & sections with eyebrow tag,
 * cyberpunk-style typography, highlighted keyword, and glowing orange underline.
 *
 * @param {string} subtitle - Eyebrow text above the main title (e.g. "HOW WE WORK")
 * @param {string} title - Main title text (e.g. "OUR")
 * @param {string} highlight - Highlighted keyword in orange (e.g. "METHODOLOGY")
 * @param {string} highlightPosition - Position of highlight: "end" | "start" | "none"
 * @param {React.ReactNode} children - Optional custom JSX to render inside <h2>
 * @param {string|React.ReactNode} description - Optional paragraph text below the underline
 * @param {"center"|"left"|"right"} align - Alignment ("center" by default)
 * @param {"default"|"sm"|"lg"} size - Heading size variant
 * @param {boolean} showUnderline - Whether to render the orange glowing underline (true by default)
 * @param {string|false} aos - AOS animation type ("fade-up" by default)
 * @param {number|string} aosDelay - Optional AOS delay
 * @param {string} className - Additional classes for the container
 * @param {string} titleClassName - Additional classes for the <h2>
 * @param {string} subtitleClassName - Additional classes for the eyebrow <p>
 * @param {string} descriptionClassName - Additional classes for the description <p>
 * @param {string} underlineClassName - Additional classes for the underline <div>
 */
const SectionTitle = ({
  subtitle,
  title,
  highlight,
  highlightPosition = "end",
  children,
  description,
  align = "center",
  size = "default",
  showUnderline = true,
  aos = "fade-up",
  aosDelay,
  className = "",
  titleClassName = "",
  subtitleClassName = "",
  descriptionClassName = "",
  underlineClassName = "",
}) => {
  // Alignment styles
  const isLeft = align === "left";
  const isRight = align === "right";

  const containerAlign = isLeft
    ? "text-left"
    : isRight
      ? "text-right ml-auto"
      : "text-center mx-auto";

  const underlineAlign = isLeft
    ? "mr-auto"
    : isRight
      ? "ml-auto"
      : "mx-auto";

  const descAlign = isLeft
    ? "text-left"
    : isRight
      ? "text-right"
      : "text-center mx-auto";

  // Heading sizes
  const sizeClasses = {
    sm: "text-lg sm:text-xl md:text-2xl",
    default: "text-xl sm:text-2xl md:text-3xl lg:text-[1.7rem]",
    lg: "text-2xl sm:text-2.5xl md:text-3xl lg:text-[2rem]",
  }[size] || "text-xl sm:text-2xl md:text-3xl lg:text-4xl";

  const aosProps = aos
    ? {
      "data-aos": aos,
      ...(aosDelay !== undefined ? { "data-aos-delay": aosDelay } : {}),
    }
    : {};

  return (
    <div
      {...aosProps}
      className={`relative z-10 max-w-3xl mb-8 sm:mb-10 ${containerAlign} ${className}`}
    >
      {/* Eyebrow Subtitle */}
      {subtitle && (
        <p
          className={`mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FF6A00] sm:text-xs md:text-xs ${subtitleClassName}`}
        >
          {subtitle}
        </p>
      )}

      {/* Main Heading */}
      <h2
        className={`hero-font font-bold uppercase leading-tight tracking-[-0.035em] text-white ${sizeClasses} ${titleClassName}`}
      >
        {children ? (
          children
        ) : (
          <>
            {highlight && highlightPosition === "start" && (
              <span className="text-[#FF6A00]">{highlight} </span>
            )}
            {title}
            {highlight && highlightPosition === "end" && (
              <>
                {title ? " " : ""}
                <span className="text-[#FF6A00]">{highlight}</span>
              </>
            )}
          </>
        )}
      </h2>

      {/* Glowing Orange Underline Bar */}
      {showUnderline && (
        <div
          className={`mt-3 h-[2px] w-14 bg-[#FF6A00] shadow-[0_0_10px_rgba(255,106,0,0.5)] ${underlineAlign} ${underlineClassName}`}
        />
      )}

      {/* Optional Description */}
      {description && (
        <p
          className={`mt-4 text-xs leading-[25px] text-white/70 sm:text-sm md:text-base max-w-2xl ${descAlign} ${descriptionClassName}`}
        >
          {description}
        </p>
      )}
    </div>
  );
};

export default SectionTitle;
