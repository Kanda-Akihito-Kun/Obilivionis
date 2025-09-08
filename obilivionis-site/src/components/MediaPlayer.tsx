'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface MediaPlayerProps {
  imageUrl?: string;
  audioUrl?: string;
  sentence: {
    japanese: string;
    chinese: string;
    time_range: string;
  };
  className?: string;
}

export default function MediaPlayer({ imageUrl, audioUrl, sentence, className = '' }: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioLoading, setAudioLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 音频播放控制
  const togglePlay = async () => {
    if (!audioRef.current || audioError) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('播放失败:', error);
        console.error('音频URL:', audioUrl);
        setAudioError(true);
        setIsPlaying(false);
      }
    }
  };

  // 音频事件处理
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setAudioLoading(false);
      setAudioError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.error('音频加载错误:', e);
      console.error('音频URL:', audioUrl);
      console.error('错误详情:', (e.target as HTMLAudioElement)?.error);
      setAudioError(true);
      setAudioLoading(false);
      setIsPlaying(false);
    };

    const handleLoadStart = () => {
      setAudioLoading(true);
      setAudioError(false);
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  // 格式化时间显示
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 进度条拖拽
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return (
    <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 ${className}`}>
      {/* 例句文本 */}
      <div className="mb-4">
        <div className="text-lg font-medium text-gray-900 dark:text-white mb-1">
          {sentence.japanese}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          {sentence.chinese}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          时间: {sentence.time_range}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 图片显示区域 */}
        <div className="relative">
          <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden relative">
            {imageUrl && !imageError ? (
              <>
                <Image
                  src={imageUrl}
                  alt={`场景截图 - ${sentence.japanese}`}
                  fill
                  className={`object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <div className="text-2xl mb-2">🖼️</div>
                  <div className="text-sm">
                    {imageError ? '图片加载失败' : '暂无图片'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 音频播放区域 */}
        <div className="flex flex-col justify-center">
          {audioUrl ? (
            <>
              <audio ref={audioRef} src={audioUrl} preload="metadata" />
              
              {audioLoading ? (
                <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <div className="text-sm">加载音频中...</div>
                  </div>
                </div>
              ) : audioError ? (
                <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <div className="text-2xl mb-2">❌</div>
                    <div className="text-sm mb-1">音频加载失败</div>
                    <div className="text-xs text-gray-400">URL: {audioUrl}</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* 播放控制按钮 */}
                  <div className="flex items-center justify-center mb-4">
                    <button
                      onClick={togglePlay}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      disabled={audioError || audioLoading}
                    >
                      {isPlaying ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* 进度条 */}
                  <div className="mb-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={duration > 0 ? (currentTime / duration) * 100 : 0}
                      onChange={handleProgressChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
                    />
                  </div>

                  {/* 时间显示 */}
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <div className="text-2xl mb-2">🔊</div>
                <div className="text-sm">暂无音频</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}