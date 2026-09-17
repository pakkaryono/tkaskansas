import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`animate-pulse bg-slate-200/80 rounded-lg ${className}`} />
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => {
  return (
    <div className="w-full divide-y divide-slate-100 bg-white rounded-xl overflow-hidden border border-slate-200">
      {/* Header skeleton */}
      <div className="bg-slate-50 px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, idx) => (
          <SkeletonBox key={`th-${idx}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows skeleton */}
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={`tr-${rIdx}`} className="px-4 py-3.5 flex gap-4 items-center">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <SkeletonBox
              key={`td-${rIdx}-${cIdx}`}
              className={`h-3.5 ${cIdx === 0 ? 'w-8' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonBox className="h-5 w-1/3" />
            <SkeletonBox className="h-5 w-16 rounded-full" />
          </div>
          <SkeletonBox className="h-4 w-full" />
          <SkeletonBox className="h-4 w-2/3" />
          <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
            <SkeletonBox className="h-4 w-20" />
            <SkeletonBox className="h-8 w-24 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ExamQuestionSkeleton: React.FC = () => {
  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-6 animate-pulse">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <SkeletonBox className="h-6 w-32" />
        <SkeletonBox className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-2">
        <SkeletonBox className="h-4 w-full" />
        <SkeletonBox className="h-4 w-5/6" />
        <SkeletonBox className="h-4 w-3/4" />
      </div>
      <div className="space-y-3 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
            <SkeletonBox className="h-6 w-6 rounded-full shrink-0" />
            <SkeletonBox className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const PageFallbackSkeleton: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200">
        <div className="space-y-2">
          <SkeletonBox className="h-6 w-48 rounded-lg" />
          <SkeletonBox className="h-3.5 w-64 rounded-md" />
        </div>
        <SkeletonBox className="h-9 w-28 rounded-xl shrink-0" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
            <SkeletonBox className="h-3 w-20 rounded" />
            <SkeletonBox className="h-7 w-16 rounded" />
          </div>
        ))}
      </div>

      <TableSkeleton rows={5} columns={5} />
    </div>
  );
};
