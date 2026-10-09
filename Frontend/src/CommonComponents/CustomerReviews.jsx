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
        <div className="mb-6 text-center sm:mb-8">
            <h2 id="customer-reviews-title" className="font-serif text-2xl font-extrabold text-[#111827] sm:text-3xl">
              What Our <span className="font-serif italic text-[#075b2b]">Customers Say</span>
            </h2>
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
          <div className="relative px-1 sm:px-10">
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
              className="customer-reviews-swiper"
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
                    <article className="h-full min-h-[190px] rounded-2xl border border-[#f0f0ed] bg-white p-5 shadow-[0_5px_22px_rgba(24,40,28,0.08)] transition hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(24,40,28,0.12)] sm:p-6">
                      <div className="flex items-center gap-3.5">
                        <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#f0f3ed] bg-[#eff5e9] text-lg font-extrabold uppercase text-[#075b2b] shadow-sm">
                          {reviewImage ? (
                            <img src={reviewImage} alt="" loading="lazy" className="h-full w-full object-cover" />
                          ) : initials}
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-extrabold text-[#111827]">
                            {review.reviewer_name || "Customer"}
                          </h3>
                          <div className="mt-1 flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
                            {Array.from({ length: 5 }, (_, starIndex) => (
                              <Star
                                key={starIndex}
                                size={18}
                                fill={starIndex < rating ? "currentColor" : "none"}
                                className={starIndex < rating ? "text-[#f59e0b]" : "text-[#d7ddd5]"}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="relative mt-4 pl-1">
                        <Quote size={18} fill="currentColor" className="absolute -left-1 -top-1 text-[#075b2b]/15" />
                        {review.title && <p className="mb-1 line-clamp-1 pl-5 text-sm font-bold text-[#25342b]">{review.title}</p>}
                        <p className="line-clamp-3 pl-5 text-sm leading-6 text-[#38443d]">
                          “{review.comment}”
                        </p>
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
