import React from 'react';
import { motion } from 'framer-motion';

const RAZOR_E_PATH =
  "M0.0 57.0 L1.7 48.0 L5.7 37.0 L10.9 28.0 L15.5 22.0 L28.0 10.7 L39.0 4.7 L48.0 1.7 L59.0 0.2 L71.0 0.6 L86.0 4.8 L92.0 7.7 L102.0 14.7 L108.3 21.0 L114.4 30.0 L97.0 41.2 L62.0 61.5 L47.0 71.5 L41.0 73.5 L1.0 102.0 L0.5 101.0 L5.6 92.0 L1.6 81.0 L0.0 71.8 Z M25.3 72.0 L83.0 36.3 L87.5 33.0 L87.5 32.0 L85.0 28.9 L78.0 23.8 L71.0 20.8 L65.0 19.7 L54.0 20.6 L43.0 25.7 L38.0 29.6 L30.6 38.0 L24.7 50.0 L22.7 59.0 L22.5 68.0 L23.2 72.0 L24.0 72.8 L25.3 72.0 Z M69.0 127.0 L58.0 127.4 L50.0 126.4 L35.0 121.4 L21.3 112.0 L13.8 104.0 L11.7 100.0 L45.0 85.3 L76.0 68.7 L96.0 65.8 L95.1 69.0 L93.0 71.7 L86.0 77.1 L68.0 85.3 L44.0 92.7 L36.4 96.0 L38.0 98.5 L43.0 102.1 L50.0 105.2 L60.0 107.1 L68.0 106.5 L77.0 103.5 L84.0 99.0 L90.4 92.0 L95.0 85.0 L118.0 85.1 L118.6 86.0 L117.3 90.0 L111.4 101.0 L105.0 108.8 L98.0 115.3 L84.0 123.3 L69.0 127.0 Z M86.4 73.0 L88.3 71.0 L87.2 69.0 L86.0 68.7 L84.1 71.0 L85.0 72.8 L86.4 73.0 Z";

// Huruf-huruf untuk efek mengetik satu-persatu
const TITLE_CHARS = ['e', ' ', 'c', 'u', 'k', 'u', 'r'];
const SUBTITLE_CHARS = 'BARBER & MORE'.split('');

// 1 siklus animasi sketsa: langsung mulai digambar dari frame 0, dan terus meloop sampai jaringan selesai memuat
const CYCLE_DURATION = 3.6;

export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
      style={{ backgroundColor: '#F7F6F2' }}
    >
      <div className="relative flex flex-col items-center justify-center">
        {/* Subtle breathing glow */}
        <motion.div
          animate={{
            scale: [0.95, 1.15, 0.95],
            opacity: [0.15, 0.35, 0.15],
          }}
          transition={{
            duration: CYCLE_DURATION,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -inset-8 bg-[#285844]/20 rounded-full blur-2xl pointer-events-none"
        />

        {/* The Pure Sketch Drawing SVG (Langsung mulai dari goresan garis, tanpa ada logo jadi di awal) */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
          <svg
            viewBox="0 0 120 128"
            className="w-full h-full overflow-visible drop-shadow-sm"
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.path
              d={RAZOR_E_PATH}
              fillRule="evenodd"
              stroke="#0F1110"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              // Detik 0: kosong murni, langsung mulai digambar (pathLength: 0)
              initial={{
                pathLength: 0,
                fill: 'rgba(15, 17, 16, 0)',
                opacity: 1,
              }}
              animate={{
                pathLength: [0, 1, 1, 1, 0],
                fill: [
                  'rgba(15, 17, 16, 0)',
                  'rgba(15, 17, 16, 0)',
                  'rgba(15, 17, 16, 1)',
                  'rgba(15, 17, 16, 1)',
                  'rgba(15, 17, 16, 0)',
                ],
                opacity: [1, 1, 1, 1, 0.3],
              }}
              transition={{
                duration: CYCLE_DURATION,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
                // Timeline per siklus:
                // 0% -> 42%: goresan garis sketsa digambar dari 0 sampai utuh
                // 42% -> 55%: warna hitam pekat langsung mengisi logo
                // 55% -> 85%: logo tampil utuh jelas
                // 85% -> 100%: fade out pelan dan langsung mengulang menggambar sketsa lagi
                times: [0, 0.42, 0.55, 0.85, 1],
              }}
            />
          </svg>
        </div>

        {/* Teks Menulis Huruf Satu per Satu */}
        <div className="mt-6 flex flex-col items-center">
          {/* Baris 1: e cukur */}
          <div className="flex items-center justify-center font-sora font-extrabold text-lg sm:text-xl tracking-[0.2em] text-[#0F1110] leading-none">
            {TITLE_CHARS.map((char, idx) => {
              const startDelayFraction = 0.22 + idx * 0.035;
              return (
                <motion.span
                  key={idx}
                  animate={{
                    opacity: [0, 0, 1, 1, 0],
                    y: [4, 4, 0, 0, -2],
                  }}
                  transition={{
                    duration: CYCLE_DURATION,
                    repeat: Infinity,
                    repeatType: 'loop',
                    ease: 'easeOut',
                    times: [0, startDelayFraction, startDelayFraction + 0.04, 0.85, 1],
                  }}
                  className="inline-block"
                  style={{ width: char === ' ' ? '0.45em' : 'auto' }}
                >
                  {char}
                </motion.span>
              );
            })}
          </div>

          {/* Baris 2: BARBER & MORE */}
          <div className="flex items-center justify-center mt-1.5 font-sora font-bold text-[8px] sm:text-[9.5px] uppercase tracking-[0.32em] text-neutral-500 leading-none">
            {SUBTITLE_CHARS.map((char, idx) => {
              const startDelayFraction = 0.36 + idx * 0.02;
              return (
                <motion.span
                  key={idx}
                  animate={{
                    opacity: [0, 0, 1, 1, 0],
                    y: [3, 3, 0, 0, -2],
                  }}
                  transition={{
                    duration: CYCLE_DURATION,
                    repeat: Infinity,
                    repeatType: 'loop',
                    ease: 'easeOut',
                    times: [0, startDelayFraction, startDelayFraction + 0.035, 0.85, 1],
                  }}
                  className="inline-block"
                  style={{ width: char === ' ' ? '0.4em' : 'auto' }}
                >
                  {char}
                </motion.span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
