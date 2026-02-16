import './JobCardSkeleton.css';

type Props = {
    variant?: 1 | 2 | 3;
};

export default function JobCardSkeleton({ variant = 1 }: Props) {
    return (
        <div className={`job-card skeleton variant-${variant}`}>
            <div className="skeleton-line title" />
            <div className="skeleton-line line-1" />
            <div className="skeleton-line line-2" />
            <div className="skeleton-line line-3" />
            <div className="skeleton-pill" />
        </div>
    );
}
