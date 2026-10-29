import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { formatAudioDuration } from '../../lib/chatMedia';

export default function VoiceNotePlayer({ src, duration = 0, isOwnMessage = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio playback error:', err);
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const seekTime = Number(e.target.value);
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // Waveform bar visual (18 bars)
  const waveHeights = [25, 45, 70, 95, 60, 40, 85, 100, 75, 50, 90, 65, 40, 80, 55, 30, 60, 40];

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[200px] sm:min-w-[240px]">
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          isOwnMessage
            ? 'bg-white text-[#285844] shadow-sm'
            : 'bg-[#285844] text-white shadow-xs'
        }`}
        aria-label={isPlaying ? 'Jeda pesan suara' : 'Putar pesan suara'}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col justify-center min-w-0">
        {/* Waveform bars */}
        <div className="flex items-center gap-[3px] h-6 cursor-pointer select-none">
          {waveHeights.map((heightPercent, idx) => {
            const barPercent = ((idx + 1) / waveHeights.length) * 100;
            const isPlayed = progressPercent >= barPercent;
            return (
              <span
                key={idx}
                className={`w-1 rounded-full transition-colors duration-150 ${
                  isPlayed
                    ? isOwnMessage ? 'bg-white' : 'bg-[#285844]'
                    : isOwnMessage ? 'bg-white/40' : 'bg-neutral-300'
                }`}
                style={{ height: `${Math.max(6, (heightPercent / 100) * 22)}px` }}
              />
            );
          })}
        </div>

        {/* Hidden range input for seeking */}
        <input
          type="range"
          min={0}
          max={totalDuration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="sr-only"
          aria-label="Atur posisi audio"
        />

        <div className={`flex justify-between items-center text-[10px] mt-0.5 ${
          isOwnMessage ? 'text-emerald-100' : 'text-neutral-500'
        }`}>
          <span>{formatAudioDuration(currentTime)}</span>
          <span>{formatAudioDuration(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
}
