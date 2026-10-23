import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Leaf, Quote, Star, UsersRound } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import api, { BACKEND_BASE_URL } from "../api";
import PageContainer from "./PageContainer";
import "swiper/css";

const resolveReviewImage = (image) => {
  if (!image || typeof image !== "string") return "";
  const value = image.trim();
  if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;
  return `${BACKEND_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

const CustomerReviews = () => {
  const swiperRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReviews = useCallback(async () => {
    try {
      const response = await api.get("/reviews/published");
      setReviews(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (requestError) {
      console.error("Could not load customer reviews:", requestError);
      setError(requestError.response?.data?.message || "Customer reviews could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const retryReviews = async () => {
    setLoading(true);
    setError("");
    await fetchReviews();
  };

  if (!loading && !error && reviews.length === 0) return null;

  const ratingCounts = [5, 4, 3, 2, 1].map((starRating) => {
    const count = reviews.filter(
      (review) => Math.round(Number(review.rating) || 0) === starRating,
    ).length;
    return {
      starRating,
      percentage: reviews.length ? Math.round((count / reviews.length) * 100) : 0,
    };
  });
  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + (Number(review.rating) || 0), 0) / reviews.length
    : 0;

  return (
    <section
      className="overflow-hidden bg-[#fbfaf5] py-12 sm:py-16 lg:py-20"
      aria-labelledby="customer-reviews-title"
    >
      <PageContainer>
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(280px,0.82fr)_minmax(0,2fr)] lg:gap-10">
          <aside
            className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#042b20] via-[#06402d] to-[#0c352a] pt-7 text-white shadow-[0_20px_55px_rgba(15,53,37,0.16)]"
            aria-label="Customer review rating summary"
          >
            <Leaf
              aria-hidden="true"
              className="absolute -right-5 top-12 h-40 w-40 rotate-[-28deg] text-[#b6c889] opacity-[0.12]"
              strokeWidth={0.8}
            />
            <div className="relative px-6 pb-7 sm:px-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/90">
                Customer reviews
                <span className="ml-3 inline-block w-10 align-middle border-t border-[#d6a442]" />
              </p>
              <div className="mt-3 flex items-end gap-2">
                <span className="font-serif text-6xl leading-none sm:text-7xl">
                  {loading ? "—" : averageRating.toFixed(1)}
                </span>
                <span className="mb-1 font-serif text-2xl text-[#d5a233]">/ 5</span>
              </div>
              <div className="mt-3 flex gap-1" aria-label={`${averageRating.toFixed(1)} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    size={27}
                    fill="currentColor"
                    className={index < Math.round(averageRating) ? "text-[#e6a622]" : "text-white/25"}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <p className="mt-3 text-sm text-white/90">
                Based on {loading ? "…" : reviews.length} recent published {reviews.length === 1 ? "review" : "reviews"}
              </p>
            </div>

            <div className="relative rounded-t-[22px] bg-[#fffef9] px-6 py-6 text-[#18372b] sm:px-8">
              <div className="space-y-3">
                {ratingCounts.map(({ starRating, percentage }) => (
                  <div key={starRating} className="grid grid-cols-[52px_minmax(0,1fr)_34px] items-center gap-3 text-sm">
                    <span>{starRating} Star</span>
                    <span
                      className="h-3 overflow-hidden rounded-full bg-[#f2f0e6]"
                      role="progressbar"
                      aria-label={`${starRating} star reviews`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentage}
                    >
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-[#d59a1d] to-[#e6b546]"
                        style={{ width: `${percentage}%` }}
                      />
                    </span>
                    <span className="text-right font-semibold">{loading ? "—" : `${percentage}%`}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#f7f5e9] px-4 py-3">
                <UsersRound aria-hidden="true" size={36} className="shrink-0 text-[#d29a1e]" />
                <div>
                  <p className="font-serif text-2xl font-bold leading-none">
                    {loading ? "—" : reviews.length.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-[#58645d]">Recent reviews</p>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <header className="mb-7 text-center lg:mb-8">
              <p className="flex items-center justify-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#163d2c]">
                <span className="w-10 border-t border-[#c69a40]" />
                Testimonials
                <span className="w-10 border-t border-[#c69a40]" />
              </p>
              <h2
                id="customer-reviews-title"
                className="mt-3 font-serif text-3xl font-bold leading-tight text-[#0c3828] sm:text-4xl xl:text-5xl"
              >
                What Our <span className="italic text-[#bb8a2d]">Customers Say</span>
              </h2>
              <p className="mt-2 text-base text-[#69736e] sm:text-lg">
                Real stories. Real flavours. Real happiness.
              </p>
            </header>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading customer reviews">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-[330px] animate-pulse rounded-[22px] border border-[#efeee7] bg-white p-6">
                    <div className="h-5 w-32 rounded bg-[#edf1e9]" />
                    <div className="mt-8 h-4 w-2/3 rounded bg-[#edf1e9]" />
                    <div className="mt-3 h-3 w-full rounded bg-[#edf1e9]" />
                    <div className="mt-2 h-3 w-4/5 rounded bg-[#edf1e9]" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-[#f2d4ca] bg-white p-6 text-center">
                <p className="text-sm text-[#8c3b27]">{error}</p>
                <button
                  type="button"
                  onClick={retryReviews}
                  className="mt-3 rounded-lg bg-[#071C18] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#396F0B]"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="relative px-1 py-2 sm:px-9">
                {reviews.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => swiperRef.current?.slidePrev()}
                      aria-label="Previous reviews"
                      className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#efeee7] bg-white text-[#183b2a] shadow-[0_4px_16px_rgba(24,40,28,0.1)] transition hover:bg-[#075b2b] hover:text-white"
                    >
                      <ChevronLeft size={21} />
                    </button>
                    <button
                      type="button"
                      onClick={() => swiperRef.current?.slideNext()}
                      aria-label="Next reviews"
                      className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#efeee7] bg-white text-[#183b2a] shadow-[0_4px_16px_rgba(24,40,28,0.1)] transition hover:bg-[#075b2b] hover:text-white"
                    >
                      <ChevronRight size={21} />
                    </button>
                  </>
                )}
                <Swiper
                  className="customer-reviews-swiper !overflow-hidden !py-2"
                  onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                  }}
                  spaceBetween={14}
                  slidesPerView={1}
                  loop={reviews.length > 3}
                  breakpoints={{
                    640: { slidesPerView: 2, spaceBetween: 16 },
                    1024: { slidesPerView: 3, spaceBetween: 20 },
                  }}
                >
                  {reviews.map((review, index) => {
                    const reviewImage = resolveReviewImage(review.review_photo);
                    const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
                    const initials = String(review.reviewer_name || "Customer")
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part.charAt(0))
                      .join("");

                    return (
                      <SwiperSlide key={`${review.reviewer_name}-${review.created_at}-${index}`} className="!h-auto">
                        <article className="flex h-full min-h-[330px] flex-col rounded-[22px] border border-[#f0eee6] bg-white/90 p-5 shadow-[0_10px_28px_rgba(31,48,36,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(31,48,36,0.1)] sm:p-6">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
                              {Array.from({ length: 5 }, (_, starIndex) => (
                                <Star
                                  key={starIndex}
                                  size={20}
                                  fill={starIndex < rating ? "currentColor" : "none"}
                                  className={starIndex < rating ? "text-[#dfa11d]" : "text-[#deded2]"}
                                  strokeWidth={1.5}
                                />
                              ))}
                            </span>
                            <span className="text-base font-bold text-[#153c2b]">{rating.toFixed(1)}</span>
                          </div>
                          <div className="relative mt-7 flex-1">
                            <Quote
                              aria-hidden="true"
                              size={25}
                              fill="currentColor"
                              className="absolute -left-1 -top-3 text-[#b7c69e]"
                            />
                            {review.title && (
                              <p className="mb-1 line-clamp-1 pl-5 text-sm font-bold text-[#25342b]">
                                {review.title}
                              </p>
                            )}
                            <p className="line-clamp-5 pl-5 text-sm leading-6 text-[#283c32] sm:text-base sm:leading-7">
                              {review.comment}
                            </p>
                          </div>
                          <div className="mt-5 flex items-center gap-3 border-t border-[#eeece3] pt-4">
                            <span className="flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eaf3e5] text-base font-extrabold uppercase text-[#075b2b]">
                              {reviewImage ? (
                                <img src={reviewImage} alt={`${review.reviewer_name || "Customer"} profile`} loading="lazy" className="h-full w-full object-cover" />
                              ) : initials}
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-extrabold text-[#153c2b] sm:text-base">
                                {review.reviewer_name || "Customer"}
                              </h3>
                              <p className="mt-1 truncate text-sm text-[#68736e]">
                                {review.product_name || "A happy dining experience"}
                              </p>
                            </div>
                          </div>
                        </article>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </section>
  );
};

export default CustomerReviews;
