import { useCallback, useEffect, useState } from "react";
import { CalendarDays, MessageSquareQuote, Star } from "lucide-react";
import api, { BACKEND_BASE_URL } from "../api";
import PageContainer from "./PageContainer";

const resolveReviewImage = (image) => {
  if (!image || typeof image !== "string") return "";
  const value = image.trim();
  if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;
  return `${BACKEND_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

const formatReviewDate = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const CustomerReviews = () => {
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
    <section className="bg-[#f8f8f4] py-10 sm:py-14" aria-labelledby="customer-reviews-title">
      <PageContainer>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#FD5E02]">
              From our food lovers
            </p>
            <h2 id="customer-reviews-title" className="mt-1 font-serif text-2xl font-bold text-[#071C18] sm:text-3xl">
              What Our Customers Say
            </h2>
            <p className="mt-1 text-sm text-[#69736e]">
              Honest words from guests who have shared a meal with us.
            </p>
          </div>
          {!loading && !error && reviews.length > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#f1e5c5] bg-white px-3 py-2 text-xs font-bold text-[#755300] shadow-sm">
              <Star size={14} fill="currentColor" className="text-[#FEB914]" />
              {reviews.length} customer {reviews.length === 1 ? "review" : "reviews"}
            </div>
          )}
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reviews.slice(0, 6).map((review, index) => {
              const reviewImage = resolveReviewImage(review.review_photo);
              const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
              const reviewDate = formatReviewDate(review.created_at);

              return (
                <article
                  key={`${review.reviewer_name}-${review.created_at}-${index}`}
                  className="group overflow-hidden rounded-2xl border border-[#e8ebe5] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#c9d9bf] hover:shadow-md"
                >
                  {reviewImage && (
                    <div className="h-40 overflow-hidden bg-[#eff5e9]">
                      <img
                        src={reviewImage}
                        alt={review.product_name ? `Review of ${review.product_name}` : "Customer review"}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
                        {Array.from({ length: 5 }, (_, starIndex) => (
                          <Star
                            key={starIndex}
                            size={15}
                            fill={starIndex < rating ? "currentColor" : "none"}
                            className={starIndex < rating ? "text-[#FEB914]" : "text-[#d7ddd5]"}
                          />
                        ))}
                      </div>
                      {reviewDate && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#7b8580]">
                          <CalendarDays size={12} />
                          {reviewDate}
                        </span>
                      )}
                    </div>
                    {review.title && (
                      <h3 className="mt-3 line-clamp-1 text-sm font-bold text-[#071C18]">
                        {review.title}
                      </h3>
                    )}
                    <div className="mt-2 flex items-start gap-2">
                      <MessageSquareQuote size={17} className="mt-0.5 shrink-0 text-[#396F0B]" />
                      <p className="line-clamp-4 text-sm leading-6 text-[#53605a]">{review.comment}</p>
                    </div>
                    <div className="mt-4 flex items-center gap-3 border-t border-[#edf0eb] pt-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eff5e9] text-xs font-extrabold uppercase text-[#396F0B]">
                        {String(review.reviewer_name || "Customer").trim().charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#071C18]">{review.reviewer_name || "Customer"}</p>
                        {review.product_name && (
                          <p className="truncate text-[10px] text-[#7b8580]">About {review.product_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PageContainer>
    </section>
  );
};

export default CustomerReviews;
