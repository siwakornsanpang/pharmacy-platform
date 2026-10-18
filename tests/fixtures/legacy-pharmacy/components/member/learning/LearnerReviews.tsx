"use client";

import React from 'react';
import { Quote, Star } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import styles from './LearnerReviews.module.css';
import SectionHeader from '@/components/ui/SectionHeader';
import type { AcademyReview } from '@/lib/academy';

export default function LearnerReviews({ reviews }: { reviews: AcademyReview[] }) {
    if (reviews.length === 0) return null;
    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <SectionHeader 
                    title="รีวิวจากผู้เรียน" 
                />

                <div className={styles.sliderContainer}>
                    <Swiper
                        modules={[Navigation, Pagination]}
                        spaceBetween={24}
                        slidesPerView={1}
                        navigation
                        pagination={{ clickable: true }}
                        breakpoints={{
                            768: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 }
                        }}
                        className={styles.swiper}
                    >
                        {reviews.map((review) => (
                            <SwiperSlide key={review.id} style={{ height: 'auto' }}>
                                <div className={styles.card}>
                                    <div className={styles.quoteWatermark}>
                                        <Quote size={80} fill="var(--primary-olive)" />
                                    </div>
                                    <div className={styles.rating}>
                                        {[...Array(5)].map((_, i) => (
                                            <Star 
                                                key={i} 
                                                size={16} 
                                                fill={i < review.rating ? "#FFB800" : "none"} 
                                                color={i < review.rating ? "#FFB800" : "#E5E7EB"} 
                                            />
                                        ))}
                                    </div>
                                    <p className={styles.comment}>"{review.body}"</p>
                                    <div className={styles.courseBadge}>
                                        <span className={styles.courseLabel}>คอร์สเรียน:</span>
                                        <span className={styles.courseName}>{review.courseTitle}</span>
                                    </div>
                                    <div className={styles.footer}>
                                        <div className={styles.info}>
                                            <h4 className={styles.name}>{review.reviewerName}</h4>
                                            <p className={styles.role}>{review.reviewerRole}</p>
                                        </div>
                                    </div>
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>
        </section>
    );
}
