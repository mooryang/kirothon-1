'use client';

export default function Terminal({ children, className = '' }) {
  return (
    <div className={`crt-screen h-screen bg-term-bg ${className}`}>
      {children}
    </div>
  );
}
