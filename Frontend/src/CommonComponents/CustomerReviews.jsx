import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
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

  return (
    <section className="bg-white py-10 sm:py-14" aria-labelledby="customer-reviews-title">
      <PageContainer>
        <div className="mb-7 text-center sm:mb-9">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#FD5E02]">
            TESTIMONIALS
          </p>
          <h2 id="customer-reviews-title" className="mt-1 font-serif text-2xl font-extrabold text-[#111827] sm:text-3xl">
            What Our <span className="font-serif italic text-[#075b2b]">Customers Say</span>
          </h2>
          <p className="mt-2 text-sm text-[#69736e]">
            A little love from the people around our table.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading customer reviews">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-52 animate-pulse rounded-2xl border border-[#e8ebe5] bg-white p-5">
                <div className="h-4 w-24 rounded bg-[#edf1e9]" />
                <div className="mt-5 h-4 w-2/3 rounded bg-[#edf1e9]" />
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
          <div className="relative overflow-x-clip px-1 py-2 sm:px-10">
            {reviews.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => swiperRef.current?.slidePrev()}
                  aria-label="Previous reviews"
                  className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#edf0eb] bg-white text-[#183b2a] shadow-md transition hover:border-[#075b2b] hover:bg-[#075b2b] hover:text-white"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => swiperRef.current?.slideNext()}
                  aria-label="Next reviews"
                  className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#edf0eb] bg-white text-[#183b2a] shadow-md transition hover:border-[#075b2b] hover:bg-[#075b2b] hover:text-white"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
            <Swiper
              className="customer-reviews-swiper !overflow-visible !py-2"
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
                    <article className="group relative flex h-full min-h-[230px] flex-col overflow-hidden rounded-[22px] border border-[#e8ede5] bg-gradient-to-br from-white via-white to-[#f6f9f3] p-5 shadow-[0_8px_26px_rgba(24,40,28,0.07)] transition duration-300 hover:-translate-y-1 hover:border-[#c7d9bd] hover:shadow-[0_14px_34px_rgba(24,40,28,0.13)] sm:p-6">
                      <span aria-hidden="true" className="absolute -right-7 -top-9 h-24 w-24 rounded-full border-[16px] border-[#eff5e9]/80 transition-transform duration-300 group-hover:scale-110" />
                      <div className="relative flex items-center gap-3.5">
                        <span className="flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-[#eaf3e5] text-base font-extrabold uppercase text-[#075b2b] shadow-[0_3px_12px_rgba(7,91,43,0.16)] ring-1 ring-[#dce8d5]">
                          {reviewImage ? (
                            <img src={reviewImage} alt={`${review.reviewer_name || "Customer"} profile`} loading="lazy" className="h-full w-full object-cover" />
                          ) : initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-extrabold tracking-wide text-[#111827] sm:text-base">
                            {review.reviewer_name || "Customer"}
                          </h3>
                          <span className="mt-1 inline-flex items-center rounded-full bg-[#eff6eb] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#397342]">
                            Customer review
                          </span>
                        </div>
                        <span className="relative inline-flex shrink-0 items-center gap-1 rounded-full border border-[#f3e5bd] bg-[#fffaf0] px-2 py-1 text-[10px] font-extrabold text-[#805b08]">
                          <Star size={12} fill="currentColor" className="text-[#f5a900]" />
                          {rating}.0
                        </span>
                      </div>
                      <div className="relative mt-5 flex-1 rounded-xl bg-[#f7f9f5] px-4 py-3.5">
                        <Quote size={21} fill="currentColor" className="absolute -left-1.5 -top-2 rounded-full bg-white p-1 text-[#397342] shadow-sm" />
                        {review.title && <p className="mb-1 line-clamp-1 pl-3 text-xs font-extrabold text-[#25342b] sm:text-sm">{review.title}</p>}
                        <p className="line-clamp-3 pl-3 text-xs leading-5 text-[#53605a] sm:text-sm sm:leading-6">
                          “{review.comment}”
                        </p>
                      </div>
                      <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-[#e9eee6] pt-3">
                        <span className="truncate text-[10px] font-semibold text-[#617068]">
                          {review.product_name ? `About ${review.product_name}` : "A happy dining experience"}
                        </span>
                        <span className="flex shrink-0 items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
                          {Array.from({ length: 5 }, (_, starIndex) => (
                            <Star
                              key={starIndex}
                              size={12}
                              fill={starIndex < rating ? "currentColor" : "none"}
                              className={starIndex < rating ? "text-[#f5a900]" : "text-[#d7ddd5]"}
                            />
                          ))}
                        </span>
                      </div>
                    </article>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>
        )}
      </PageContainer>
    </section>
  );
};

export default CustomerReviews;
