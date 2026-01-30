"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

const MediaCarousel = ({ items = [], autoPlay = false, interval = 5000, showThumbnails = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const touchStartX = useRef(null);

  if (!items || items.length === 0) return null;

  // Helper to check if video (bug-proof)
  const checkIsVideo = (item) => {
    if (!item) return false;
    if (item.type === 'video') return true;
    const url = item.url;
    if (typeof url !== 'string') return false;
    return url.match(/\.(mp4|webm|mov|ogg|mkv)(\?.*)?$/i) !== null;
  };

  // Helper to get src string
  const getSrc = (item) => {
    if (!item) return '';
    if (typeof item.url === 'string') return item.url;
    if (item.url?.src) return item.url.src;
    return item.url || '';
  };

  const currentItem = items[currentIndex];
  const isVideo = checkIsVideo(currentItem);

  // Navigation
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setImageError(false);
  }, [items.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setImageError(false);
  }, [items.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setImageError(false);
  };

  // Auto-play logic
  useEffect(() => {
    if (!isPlaying || items.length <= 1) return;
    
    const timer = setInterval(() => {
      if (!isVideo || (videoRef.current?.paused)) {
        goToNext();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, currentIndex, isVideo, interval, items.length, goToNext]);

  // Reset loading on index change
  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
          if (document.fullscreenElement) document.exitFullscreen();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, isFullscreen]);

  // Touch/Swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goToNext() : goToPrev();
    }
    touchStartX.current = null;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Share/Download handler (previous functionality)
  const handleShareResult = async () => {
    if (!containerRef.current) return;
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(containerRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#0f172a',
      });
      
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `carousel-${Date.now()}.png`, { type: 'image/png' });
      
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Check this out',
          files: [file],
        });
      } else {
        const link = document.createElement('a');
        link.download = 'carousel-image.png';
        link.href = imageUrl;
        link.click();
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative group ${isFullscreen ? 'bg-black' : 'bg-white/5 backdrop-blur-sm'} rounded-2xl overflow-hidden border border-white/10 shadow-2xl transition-all duration-300`}
    >
      {/* Main Display Area */}
      <div 
        className={`relative ${isFullscreen ? 'h-screen' : 'aspect-video'} bg-[#F5EFE7] overflow-hidden`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Loading Spinner */}
        {isLoading && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10">
            <div className="w-12 h-12 border-4 border-white/10 border-t-purple-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Error State */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-10">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Failed to load media</p>
            </div>
          </div>
        )}

        {/* Media Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isVideo ? (
            <video
              ref={videoRef}
              src={getSrc(currentItem)}
              poster={currentItem.poster}
              className="w-full h-full object-contain"
              controls
              autoPlay={currentItem.autoPlay}
              loop={currentItem.loop}
              muted={currentItem.muted}
              onLoadedData={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
              onPlay={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(autoPlay)}
              onEnded={() => setIsPlaying(autoPlay)}
            />
          ) : (
            <Image
              src={getSrc(currentItem)}
              alt={currentItem?.alt || `Slide ${currentIndex + 1}`}
              fill
              className="object-contain transition-transform duration-500 group-hover:scale-105"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setImageError(true);
                setIsLoading(false);
              }}
              sizes="(max-width: 768px) 100vw, 1200px"
              priority={currentIndex === 0}
            />
          )}
        </div>

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 z-20"
              aria-label="Previous slide"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 z-20"
              aria-label="Next slide"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Top Controls */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          {autoPlay && !isVideo && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          )}
          
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all"
            aria-label="Toggle fullscreen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>

        {/* Slide Counter */}
        <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white text-sm font-medium z-20">
          {currentIndex + 1} / {items.length}
        </div>

        {/* Caption */}
        {currentItem?.caption && (
          <div className="absolute bottom-4 left-4 right-20 text-white z-20">
            <p className="text-sm font-medium drop-shadow-lg line-clamp-2">{currentItem.caption}</p>
          </div>
        )}

        {/* Media Type Indicator */}
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white text-xs font-medium flex items-center gap-1.5 z-20">
          {isVideo ? (
            <>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Video
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Image
            </>
          )}
        </div>
      </div>

      {/* Dots Navigation */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white w-6' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Thumbnails Strip */}
      {showThumbnails && items.length > 1 && (
        <div className={`${isFullscreen ? 'absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-4' : 'bg-white/5 p-4 border-t border-white/10'} overflow-x-auto`}>
          <div className="flex gap-3 justify-center">
            {items.map((item, index) => {
              const isItemVideo = checkIsVideo(item);
              const isActive = index === currentIndex;
              
              return (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`relative flex-shrink-0 w-20 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    isActive 
                      ? 'border-purple-500 ring-2 ring-purple-500/30 scale-105' 
                      : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  {isItemVideo ? (
                    <>
                      <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      {item.poster && (
                        <Image
                          src={item.poster}
                          alt=""
                          fill
                          className="object-cover opacity-50"
                          sizes="80px"
                        />
                      )}
                    </>
                  ) : (
                    <Image
                      src={getSrc(item)}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaCarousel;