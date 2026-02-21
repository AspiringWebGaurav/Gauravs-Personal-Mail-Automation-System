import styles from './Skeleton.module.css';

interface SkeletonProps {
    width?: string;
    height?: string;
    borderRadius?: string;
    className?: string;
}

export function Skeleton({ width = '100%', height = '16px', borderRadius, className = '' }: SkeletonProps) {
    return (
        <div
            className={`skeleton ${styles.skeleton} ${className}`}
            style={{ width, height, borderRadius }}
        />
    );
}

export function SkeletonCard() {
    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <Skeleton width="60%" height="20px" />
                <Skeleton width="80px" height="14px" />
            </div>
            <Skeleton width="100%" height="14px" />
            <Skeleton width="70%" height="14px" />
            <div className={styles.cardFooter}>
                <Skeleton width="100px" height="28px" borderRadius="var(--radius-full)" />
                <Skeleton width="40px" height="14px" />
            </div>
        </div>
    );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
    return (
        <div className={styles.list}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
