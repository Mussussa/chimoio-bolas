import type { Review } from "../models/Review.js";

type PublicReviewRecord = {
  id: string;
  rating: number;
  comment: string;
  imageUrl: string | null;
  createdAt: Date;
  client?: { name: string | null; avatarUrl: string | null } | null;
};

export function serializePublicReview(review: Review): PublicReviewRecord {
  const record = review.toJSON() as PublicReviewRecord;
  return {
    id: record.id,
    rating: record.rating,
    comment: record.comment,
    imageUrl: record.imageUrl,
    createdAt: record.createdAt,
    client: record.client
      ? { name: record.client.name, avatarUrl: record.client.avatarUrl }
      : null
  };
}
