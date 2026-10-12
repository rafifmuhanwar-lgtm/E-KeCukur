import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, ArrowRight, User, PlayCircle, Star, ShieldCheck, Coffee, Scissors, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import FlexCarousel from '../components/FlexCarousel';
import AccordionGallery from '../components/AccordionGallery';

gsap.registerPlugin(ScrollTrigger);

// ─── Text Split Reveal Component (GTA VI Style) ───
function SplitTextReveal({ children, className = "", as: Tag = "h2", delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const words = ref.current.querySelectorAll('.split-word');
    gsap.fromTo(words,
      { y: '110%', opacity: 0, rotateX: 90 },
      {
        y: '0%', opacity: 1, rotateX: 0,
        stagger: 0.08,
        duration: 1,
        delay,
        ease: "power4.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        }
      }
    );
  }, [delay]);

  const words = children.split(' ');
  return (
    <Tag ref={ref} className={className} style={{ perspective: '600px' }}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden mr-[0.3em]">
          <span className="split-word inline-block" style={{ transformOrigin: 'bottom center' }}>
            {word}
          </span>
        </span>
      ))}
    </Tag>
  );
}

// ─── Counter Animation Component ───
function AnimatedCounter({ target, suffix = "", label, duration = 2 }) {
  const ref = useRef(null);
  const countRef = useRef(null);

  useEffect(() => {
    if (!ref.current || !countRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(countRef.current,
        { innerText: 0 },
        {
          innerText: target,
          duration,
          ease: "power2.out",
          snap: { innerText: 1 },
          scrollTrigger: {
            trigger: ref.current,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
          onUpdate: function() {
            if (countRef.current) {
              countRef.current.textContent = Math.round(this.targets()[0].innerText) + suffix;
            }
          }
        }
      );
    }, ref);
    return () => ctx.revert();
  }, [target, suffix, duration]);

  return (
    <div ref={ref} className="text-center">
      <div ref={countRef} className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter text-white mb-2">
        0{suffix}
      </div>
      <div className="text-xs sm:text-sm uppercase tracking-[0.3em] text-gray-500 font-bold">{label}</div>
    </div>
  );
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hiddenNavbar, setHiddenNavbar] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  // 3D Flip State for Fan Out Cards
  const cardInnerRefs = useRef([]);
  const [flippedCards, setFlippedCards] = useState({});

  const handleCardClick = (index, e) => {
    if (e) e.stopPropagation();
    const isFlipped = flippedCards[index];
    const target = cardInnerRefs.current[index];
    
    if (target) {
      const outerCard = target.closest('.fanout-card');
      
      if (!isFlipped) {
        // Pop out to front
        if (outerCard) gsap.set(outerCard, { zIndex: 50 });
        
        gsap.to(target, {
          rotateY: 180,
          scale: 1.15,
          boxShadow: "0 20px 80px rgba(0,0,0,0.9)",
          duration: 0.8,
          ease: "back.out(1.4)",
        });
      } else {
        // Return to deck
        // Immediately reset zIndex so it doesn't float over other cards during reverse flip
        if (outerCard) gsap.set(outerCard, { zIndex: 10 });
        
        gsap.to(target, {
          rotateY: 0,
          scale: 1,
          boxShadow: "0 0 50px rgba(0,0,0,0.6)",
          duration: 0.8,
          ease: "back.out(1.4)",
        });
      }
      setFlippedCards(prev => ({ ...prev, [index]: !isFlipped }));
    }
  };
  
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 300]);

  // Auto hide/show navbar berdasarkan posisi scroll
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setHiddenNavbar(latest > 0.15);
  });

  // Cinematic Splash Screen State (Auto slowmo sequence)
  const [splashStep, setSplashStep] = useState(0);
  const [splashState, setSplashState] = useState('typing');

  // Lock scroll during splash screen & force reset to top on mount/refresh
  useEffect(() => {
    // Disable browser's auto scroll restoration on reload
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const preventScroll = (e) => {
      e.preventDefault();
    };

    if (splashState !== 'done') {
      window.scrollTo(0, 0);
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      window.addEventListener('wheel', preventScroll, { passive: false });
      window.addEventListener('touchmove', preventScroll, { passive: false });
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      ScrollTrigger.refresh();
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
    };
  }, [splashState]);

  useEffect(() => {
    const t1 = setTimeout(() => setSplashStep(1), 400);
    const t2 = setTimeout(() => setSplashStep(2), 1800);
    const t3 = setTimeout(() => { setSplashStep(3); setSplashState('morphed'); }, 3200);
    const t4 = setTimeout(() => { setSplashStep(4); setSplashState('done'); }, 4800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // ─── GSAP Master Timeline refs ───
  const mainContainerRef = useRef(null);
  const videoPinSectionRef = useRef(null);
  const videoCardRef = useRef(null);
  const videoInitialTextRef = useRef(null);
  const videoOverlayTextRef = useRef(null);
  const videoFadeOverlayRef = useRef(null);
  const marqueeRef = useRef(null);
  const marqueeInnerRef = useRef(null);
  const galleryPinRef = useRef(null);
  const carouselEngineRef = useRef(null);
  const capsterPinRef = useRef(null);
  const cinematicBannerRef = useRef(null);
  const wallOfFameRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {

      // ━━━ 1. SCROLL-VELOCITY MARQUEE (Speed up on fast scroll) ━━━
      if (marqueeInnerRef.current) {
        let currentVelocity = 1;
        ScrollTrigger.create({
          trigger: marqueeRef.current,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            const velocity = Math.abs(self.getVelocity()) / 1000;
            currentVelocity = gsap.utils.clamp(1, 6, velocity);
            gsap.to(marqueeInnerRef.current, {
              timeScale: currentVelocity,
              duration: 0.3,
              overwrite: true
            });
          }
        });
        // Base marquee animation (GSAP replaces CSS for velocity control)
        const marqueeAnim = gsap.to(marqueeInnerRef.current, {
          xPercent: -50,
          duration: 20,
          ease: "none",
          repeat: -1,
        });
        // Store animation on element for velocity control
        marqueeInnerRef.current._anim = marqueeAnim;
      }

      // ━━━ 2. SERVICE CARDS POKER FAN OUT ━━━
      const fanOutContainer = document.querySelector('#services-fanout-container');
      const cards = gsap.utils.toArray('.fanout-card');
      
      if (fanOutContainer && cards.length > 0) {
        gsap.set(cards, {
          position: "absolute",
          top: "63%", 
          left: "50%",
          xPercent: -50,
          yPercent: -30, 
          transformOrigin: "50% 70%", // Move origin higher up so rotation doesn't swing them wildly
        });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: fanOutContainer,
            start: "top top",
            end: "+=150%", 
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          }
        });

        cards.forEach((card, i) => {
          tl.to(card, {
            x: () => {
              const isMobile = window.innerWidth < 768;
              const spreads = isMobile ? [-18, -6, 6, 18] : [-32, -10.5, 10.5, 32];
              return `${spreads[i]}vw`;
            },
            y: () => {
              const isMobile = window.innerWidth < 768;
              const spreads = isMobile ? [6, 0, 0, 6] : [8, 0, 0, 8];
              return `${spreads[i]}vh`;
            },
            rotation: () => {
              const isMobile = window.innerWidth < 768;
              const rots = isMobile ? [-8, -2.5, 2.5, 8] : [-14, -4.5, 4.5, 14];
              return rots[i];
            },
            scale: () => {
              return window.innerWidth < 768 ? 0.85 : 1;
            },
            ease: "power2.out",
          }, 0); 
        });
      }

      // ━━━ 3. PINNED VIDEO EXPAND (Initial Text + Fullscreen + Slowmo End Transition) ━━━
      const videoTl = gsap.timeline({
        scrollTrigger: {
          trigger: videoPinSectionRef.current,
          start: "top top",
          end: "+=360%", // Diperpanjang agar efek expand dan perpindahan terasa slow-motion dan tidak buru-buru
          pin: true,
          scrub: 1.8, // Inertia scroll ekstra halus dan sinematik
          anticipatePin: 1,
          invalidateOnRefresh: true,
        }
      });

      // Initial state: centered rounded card with bold overlay text
      gsap.set(videoCardRef.current, {
        scale: 0.58,
        borderRadius: "32px",
        overflow: "hidden"
      });
      gsap.set(videoInitialTextRef.current, {
        opacity: 1,
        scale: 1,
        y: 0
      });
      gsap.set(videoOverlayTextRef.current, {
        opacity: 0,
        y: 40
      });
      gsap.set(videoFadeOverlayRef.current, {
        opacity: 0
      });

      // Step 1: Video expands perlahan dalam format slowmo, initial text fades out lembut
      videoTl
        .to(videoCardRef.current, { 
          scale: 1, 
          borderRadius: "0px", 
          ease: "power1.inOut", 
          duration: 2.6 
        }, 0)
        .to(videoInitialTextRef.current, {
          opacity: 0,
          scale: 1.15,
          y: -25,
          ease: "power1.out",
          duration: 1.4
        }, 0)
        // Step 2: Expanded text message reveals in slowmo dan bertahan nyaman saat di-scroll
        .fromTo(videoOverlayTextRef.current,
          { opacity: 0, y: 35 },
          { opacity: 1, y: 0, ease: "power2.out", duration: 1.2 },
          1.8
        )
        // Step 3: Transisi keluar lembut (hanya pinggiran vignette mendalam, tanpa layar jadi hitam pekat)
        .to(videoOverlayTextRef.current, {
          opacity: 0,
          y: -25,
          duration: 1.0,
          ease: "power1.in"
        }, "+=0.9")
        .to(videoFadeOverlayRef.current, {
          opacity: 0.9,
          duration: 1.2,
          ease: "power1.inOut"
        }, "-=0.8");

      // ━━━ 4. CINEMATIC BANNER PARALLAX ━━━
      if (cinematicBannerRef.current) {
        const bannerImg = cinematicBannerRef.current.querySelector('.cinematic-banner-img');
        if (bannerImg) {
          gsap.fromTo(bannerImg,
            { yPercent: -20, scale: 1.15 },
            {
              yPercent: 20, scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: cinematicBannerRef.current,
                start: "top bottom",
                end: "bottom top",
                scrub: 1,
              }
            }
          );
        }
        // Clip-path reveal for banner
        gsap.fromTo(cinematicBannerRef.current,
          { clipPath: "inset(15% 15% 15% 15%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            ease: "power2.inOut",
            scrollTrigger: {
              trigger: cinematicBannerRef.current,
              start: "top 85%",
              end: "top 30%",
              scrub: 1,
            }
          }
        );
      }

      // ━━━ 5. CINEMATIC CAPSTER SHOWCASE ━━━
      if (capsterPinRef.current) {
        const capsterCards = capsterPinRef.current.querySelectorAll('.capster-card');
        gsap.fromTo(capsterCards,
          { 
            y: 80, 
            opacity: 0, 
            scale: 0.92,
            rotateY: -8
          },
          {
            y: 0, 
            opacity: 1, 
            scale: 1,
            rotateY: 0,
            duration: 1,
            stagger: 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: capsterPinRef.current,
              start: "top 75%",
              toggleActions: "play none none reverse",
            }
          }
        );
      }



      // ━━━ 6. PINNED MASTERPIECE GALLERY SCRUB ━━━
      if (galleryPinRef.current) {
        ScrollTrigger.create({
          trigger: galleryPinRef.current,
          start: "top top",
          end: "+=220%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (carouselEngineRef.current?.setProgress) {
              carouselEngineRef.current.setProgress(self.progress);
            }
          }
        });
      }

      // ━━━ 7. STAGGERED FEATURE CARDS (Enhanced 3D) ━━━
      gsap.fromTo('.gta-feature-card',
        { y: 80, opacity: 0, scale: 0.9 },
        {
          y: 0, opacity: 1, scale: 1,
          stagger: 0.15,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: '#standard-section',
            start: "top 75%",
          }
        }
      );

      // ━━━ 8. TESTIMONIAL CARDS STAGGER ━━━
      gsap.utils.toArray('.testimonial-card').forEach((card, i) => {
        gsap.fromTo(card,
          { x: 100, opacity: 0 },
          {
            x: 0, opacity: 1,
            duration: 0.7,
            delay: i * 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 90%",
              toggleActions: "play none none reverse",
            }
          }
        );
      });

      // ━━━ 9. FOOTER REVEAL ━━━
      gsap.fromTo('#footer-content',
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: '#footer-content',
            start: "top 90%",
          }
        }
      );

    }, mainContainerRef);

    return () => ctx.revert();
  }, []);

  const handleSelectSpecific = () => {
    setIsModalOpen(false);
    navigate('/customer/barbers');
  };

  const handleSelectRandom = () => {
    setIsModalOpen(false);
    navigate('/booking');
  };

  const scrollWall = (dir) => {
    if (wallOfFameRef.current) {
      const amount = dir === 'left' ? -380 : 380;
      wallOfFameRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };


  return (
    <div ref={mainContainerRef} className="min-h-screen bg-black text-gray-100 font-sans selection:bg-white selection:text-black">
      
      {/* ━━━ Navbar ━━━ */}
      <motion.nav 
        initial={{ y: "-100%", opacity: 0 }}
        animate={{
          y: splashState === 'done' && !hiddenNavbar ? 0 : "-100%",
          opacity: splashState === 'done' && !hiddenNavbar ? 1 : 0
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 w-full z-50 mix-blend-difference px-4 md:px-6 py-3 md:py-6 flex justify-between items-center max-w-7xl mx-auto left-0 right-0 pointer-events-auto"
      >
        <div className="text-lg md:text-2xl font-black tracking-tighter text-white uppercase">
          E-CUKUR STUDIO
        </div>
        <div className="hidden md:flex gap-10 font-bold tracking-widest text-xs uppercase">
          <a href="#about" className="hover:text-gray-400 transition-colors">About</a>
          <a href="#services" className="hover:text-gray-400 transition-colors">Services</a>
          <a href="#locations" className="hover:text-gray-400 transition-colors">Locations</a>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="hidden md:block text-xs font-bold uppercase tracking-widest text-white hover:text-gray-400 transition-colors"
          >
            Staff / Capster Login
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="hidden sm:block border-2 border-white text-white px-4 py-2 md:px-6 md:py-2 text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
          >
            Book Now
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8"
          >
            <button onClick={() => setMobileMenuOpen(false)} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white">
              <X className="w-7 h-7" />
            </button>
            {[
              { label: 'About', href: '#about' },
              { label: 'Services', href: '#services' },
              { label: 'Locations', href: '#locations' },
            ].map((link) => (
              <a key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)}
                className="text-3xl font-black uppercase tracking-tighter text-white hover:text-gray-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-4 items-center mt-4">
              <button onClick={() => { setMobileMenuOpen(false); setIsModalOpen(true); }}
                className="bg-white text-black px-8 py-3 text-sm font-bold uppercase tracking-widest"
              >
                Book Now
              </button>
              <button onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
              >
                Staff / Capster Login
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━ Splash Screen Backdrop ━━━ */}
      <AnimatePresence>
        {splashState !== 'done' && (
          <motion.div
            key="splash-curtain"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-30 bg-black pointer-events-none select-none"
          />
        )}
      </AnimatePresence>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ SECTION 1: HERO ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section ref={heroRef} className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        <motion.div 
          initial={{ scale: 1.15, filter: "brightness(0.5) blur(4px)" }}
          animate={{
            scale: splashState === 'done' ? 1 : 1.15,
            filter: splashState === 'done' ? "brightness(0.9) contrast(1.1) blur(0px)" : "brightness(0.5) blur(4px)"
          }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ scale: heroScale, opacity: heroOpacity }} 
          className="absolute inset-0 z-0"
        >
          {/* Subtle balanced gradient so text stays readable while image is clearly visible */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-black/50 z-10"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.5)_100%)] z-10 pointer-events-none"></div>
          <img 
            src="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=2070&auto=format&fit=crop" 
            alt="Barber working" 
            className="w-full h-full object-cover grayscale brightness-95"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: splashState === 'done' ? 0.35 : 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-0 w-3/4 h-96 bg-gradient-to-b from-white/20 via-white/5 to-transparent blur-3xl pointer-events-none z-10"
        />

        <motion.div 
          style={{ y: textY, opacity: heroOpacity }} 
          animate={{ paddingTop: splashState === 'done' ? "4rem" : "0rem" }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-40 text-center px-4 sm:px-6 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-screen"
        >
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ 
              opacity: splashState === 'done' ? 1 : 0, 
              y: splashState === 'done' ? 0 : 15 
            }}
            transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs md:text-sm font-bold tracking-[0.2em] sm:tracking-[0.35em] uppercase text-neutral-400"
          >
            <span className="w-8 h-[1px] bg-neutral-600 inline-block" />
            <span>ESTABLISHED 2026 • BEKASI</span>
            <span className="w-8 h-[1px] bg-neutral-600 inline-block" />
          </motion.div>

          <motion.div 
            layout
            animate={{ scale: splashState === 'done' ? 1 : 1.15 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center text-[2.5rem] sm:text-6xl md:text-8xl lg:text-[8.5rem] font-black uppercase tracking-tighter text-white leading-[0.88] select-none mb-4 sm:mb-6 drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
          >
            <motion.div layout className="inline-flex items-center justify-center">
              {"FIND YOUR".split("").map((char, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, y: 25, filter: "blur(10px)" }}
                  animate={{ 
                    opacity: splashStep >= 1 ? 1 : 0, 
                    y: splashStep >= 1 ? 0 : 25,
                    filter: splashStep >= 1 ? "blur(0px)" : "blur(10px)"
                  }}
                  transition={{
                    delay: 0.3 + index * 0.12,
                    duration: 0.8,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className="inline-block"
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </motion.div>

            <motion.div
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{
                opacity: splashStep >= 2 ? 1 : 0,
                marginTop: splashStep >= 3 ? "0.15em" : "0.02em",
                y: splashStep >= 3 ? 0 : (splashStep >= 2 ? -6 : 15),
              }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center justify-center relative text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500"
            >
              {"STYLE".split("").map((char, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, y: 30, filter: "blur(12px)", scale: 0.8 }}
                  animate={{ 
                    opacity: splashStep >= 2 ? 1 : 0, 
                    y: splashStep >= 2 ? 0 : 30, 
                    filter: splashStep >= 2 ? "blur(0px)" : "blur(12px)",
                    scale: splashStep >= 2 ? 1 : 0.8,
                  }}
                  transition={{
                    delay: splashStep >= 2 ? (index * 0.14) : 0,
                    duration: 0.9,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="inline-block"
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0, y: 25 }}
            animate={{ 
              opacity: splashState === 'done' ? 1 : 0, 
              y: splashState === 'done' ? 0 : 25 
            }}
            transition={{ delay: 0.3, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm sm:text-base md:text-2xl font-light tracking-wide max-w-xs sm:max-w-lg md:max-w-2xl mx-auto mb-6 sm:mb-10 text-gray-300 px-2"
          >
            Lebih dari sekadar potong rambut. Ini tentang menemukan karakter sejatimu.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ 
              opacity: splashState === 'done' ? 1 : 0, 
              y: splashState === 'done' ? 0 : 30
            }}
            transition={{ delay: 0.45, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center w-full sm:w-auto px-4 sm:px-0"
          >
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-black px-8 sm:px-10 py-3.5 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] w-full sm:w-auto text-center"
            >
              Book Appointment
            </button>
            <button 
              onClick={() => {
                const el = document.getElementById('cinematic');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center justify-center gap-2 text-white px-8 py-3 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest hover:text-gray-400 transition-colors w-full sm:w-auto"
            >
              <PlayCircle className="w-5 h-5" /> View Showreel
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ SECTION 2: SCROLL-VELOCITY MARQUEE ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section ref={marqueeRef} className="border-y border-gray-800 bg-black overflow-hidden py-5 sm:py-6">
        <div ref={marqueeInnerRef} className="whitespace-nowrap flex gap-6 sm:gap-12 items-center text-2xl sm:text-4xl md:text-5xl font-black uppercase text-gray-800 tracking-tighter will-change-transform" style={{ width: 'max-content' }}>
          <span>Hair Artists</span> <span className="text-gray-700">•</span>
          <span>Hair Artists</span> <span className="text-gray-700">•</span>
          <span>Hair Artists</span> <span className="text-gray-700">•</span>
          <span className="text-white">Meet The Team</span> <span className="text-gray-700">•</span>
          <span>Hair Artists</span> <span className="text-gray-700">•</span>
          <span>Hair Artists</span> <span className="text-gray-700">•</span>
          {/* Duplicate for seamless loop */}
          <span>Hair Artists</span> <span className="text-gray-700">•</span>
          <span>Hair Artists</span> <span className="text-gray-700">•</span>
          <span>Hair Artists</span> <span className="text-gray-700">•</span>
          <span className="text-white">Meet The Team</span> <span className="text-gray-700">•</span>
          <span>Hair Artists</span> <span className="text-gray-700">•</span>
          <span>Hair Artists</span> <span className="text-gray-700">•</span>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ SECTION 3: SERVICES POKER FAN OUT ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="services-fanout-container" className="relative h-[100svh] w-full bg-black flex flex-col items-center justify-center z-50" style={{ overflow: 'visible' }}>
        {/* Title stays at the top */}
        <div className="absolute top-16 sm:top-24 px-4 md:px-6 w-full max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end z-20 pointer-events-none">
          <SplitTextReveal className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none pointer-events-auto drop-shadow-2xl">
            Signature Services
          </SplitTextReveal>
          <p className="text-gray-400 max-w-sm text-xs md:text-sm uppercase tracking-widest font-bold mt-4 md:mt-0 pointer-events-auto">
            Dirancang khusus untuk menampilkan versi terbaik dari dirimu. Eksekusi presisi tanpa kompromi.
          </p>
        </div>

        {/* The Fan Out Cards */}
        <div className="relative w-full h-full flex items-center justify-center mt-12 sm:mt-0">
          {[
            { title: "Gentleman Cut", price: "Rp 75.000", desc: "Konsultasi gaya, pencucian, pemotongan presisi, dan styling akhir.", img: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=2072&auto=format&fit=crop" },
            { title: "Hair & Beard", price: "Rp 120.000", desc: "Perawatan komplit rambut & brewok. Termasuk hot towel shave.", img: "https://images.unsplash.com/photo-1621644158485-649016e3eb3b?q=80&w=1974&auto=format&fit=crop" },
            { title: "Hair Coloring", price: "Rp 200.000", desc: "Pewarnaan profesional dengan produk premium. Konsultasi gratis.", img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2000&auto=format&fit=crop" },
            { title: "Classic Shave", price: "Rp 85.000", desc: "Cukur klasik relaksasi tradisional dengan teknik handuk hangat.", img: "https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?q=80&w=2000&auto=format&fit=crop" }
          ].map((item, i) => (
            <div 
              key={i} 
              className="fanout-card group w-[75vw] sm:w-[45vw] md:w-[28vw] lg:w-[22vw] aspect-[3/4.5] sm:aspect-[3/4] rounded-[2rem] will-change-transform z-10"
              style={{ perspective: "1500px" }}
              onClick={(e) => handleCardClick(i, e)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(i, e); }}
              tabIndex={0}
              role="button"
              aria-pressed={flippedCards[i] || false}
              aria-label={`Flip card for ${item.title}`}
            >
              {/* INNER WRAPPER FOR FLIP */}
              <div 
                ref={el => cardInnerRefs.current[i] = el}
                className="w-full h-full relative shadow-[0_0_50px_rgba(0,0,0,0.6)] rounded-[2rem] cursor-pointer"
                style={{ transformStyle: "preserve-3d" }}
              >
                
                {/* FRONT FACE */}
                <div 
                  className="absolute inset-0 w-full h-full flex flex-col bg-zinc-950 border border-gray-800 rounded-[2rem] overflow-hidden"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <div className="w-full h-[55%] relative overflow-hidden bg-gray-900">
                    <img src={item.img} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt={item.title} />
                    <div className="absolute top-4 left-4 bg-white text-black px-3 py-1 font-bold text-xs uppercase tracking-widest z-30 rounded-full">{item.price}</div>
                  </div>
                  <div className="w-full h-[45%] p-5 sm:p-6 flex flex-col justify-between border-t border-gray-900">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter group-hover:text-gray-400 transition-colors leading-tight mb-2">{item.title}</h3>
                      <p className="text-gray-500 font-light text-xs sm:text-sm line-clamp-3">{item.desc}</p>
                    </div>
                    <div className="flex justify-end items-center text-xs font-bold uppercase tracking-widest text-gray-600 group-hover:text-white transition-colors">
                      <span className="mr-2">Details</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* BACK FACE */}
                <div 
                  className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-black border border-gray-700 rounded-[2rem] overflow-hidden p-6 sm:p-8 text-center"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <div className="w-16 h-16 rounded-full border border-gray-600 flex items-center justify-center mb-6">
                    <Scissors className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white mb-4">{item.title}</h3>
                  <p className="text-gray-400 font-light text-xs sm:text-sm mb-8 leading-relaxed">
                    Layanan eksklusif dari E-CUKUR. Kami menjamin proses presisi dari awal hingga akhir. Ditangani langsung oleh capster profesional untuk hasil potongan yang sempurna.
                  </p>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setIsModalOpen(true); 
                    }}
                    className="px-6 py-3 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-gray-200 active:scale-95 transition-all rounded-full w-full shadow-lg"
                  >
                    Book This
                  </button>
                </div>
                
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ SECTION 4: CINEMATIC FULL-WIDTH BANNER DIVIDER ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section ref={cinematicBannerRef} className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] overflow-hidden will-change-transform">
        <img 
          src="https://images.unsplash.com/photo-1585747860019-8004e7fd11e0?q=80&w=2074&auto=format&fit=crop" 
        
          className="cinematic-banner-img absolute inset-0 w-full h-full object-cover grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black z-10" />
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            viewport={{ once: true }}
            className="text-center px-4"
          >
            <p className="text-xs sm:text-sm uppercase tracking-[0.4em] text-gray-400 font-bold mb-4">Where Art Meets Craft</p>
            <h2 className="text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter text-white leading-[0.9] drop-shadow-2xl">
              Precision Is <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500">Everything</span>
            </h2>
          </motion.div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ SECTION 5: PINNED VIDEO EXPAND ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section 
        id="cinematic"
        ref={videoPinSectionRef}
        className="relative h-screen w-full bg-black overflow-hidden flex items-center justify-center"
      >
        <div 
          ref={videoCardRef}
          className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center origin-center will-change-transform shadow-[0_25px_80px_rgba(0,0,0,0.8)]"
        >
          <video 
            src="/hero-video.mp4"
            autoPlay loop muted playsInline preload="auto"
            className="w-full h-full object-cover"
          />

          {/* Vignette & Contrast Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none" />

          {/* 1. INITIAL TEXT (Tampil saat video masih berupa kartu bulat di tengah, persis seperti referensi "Built to scale") */}
          <div 
            ref={videoInitialTextRef}
            className="absolute z-20 text-center px-6 max-w-2xl mx-auto flex flex-col items-center justify-center pointer-events-none will-change-transform"
          >
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.4em] text-zinc-300 font-semibold mb-3 drop-shadow">
              Studio Vision
            </p>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-white leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.9)]">
              Built To Scale
            </h2>
          </div>

          {/* 2. EXPANDED TEXT (Tampil saat video sudah membesar penuh ke seluruh layar) */}
          <div 
            ref={videoOverlayTextRef}
            className="absolute z-20 text-center px-4 max-w-4xl mx-auto flex flex-col items-center pointer-events-auto will-change-transform"
          >
            <h2 className="text-3xl sm:text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-4 sm:mb-6 text-white drop-shadow-2xl">
              CRAFTED WITH <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500">
                ABSOLUTE PRECISION
              </span>
            </h2>
            <p className="text-sm sm:text-base md:text-xl font-light tracking-wide max-w-xs sm:max-w-xl md:max-w-2xl mx-auto mb-6 sm:mb-10 text-gray-300 drop-shadow px-4 sm:px-0">
              Lebih dari sekadar potong rambut. Pengalaman grooming presisi tanpa kompromi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-white text-black px-8 sm:px-10 py-3.5 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform"
              >
                Book Appointment
              </button>
            </div>
          </div>

          {/* 3. VIGNETTE OVERLAY (Hanya pinggiran yang menggelap halus/sinematik, video tetap kelihatan) */}
          <div 
            ref={videoFadeOverlayRef}
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_20%,rgba(0,0,0,0.88)_100%)] pointer-events-none z-30 opacity-0 will-change-transform"
          />
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ SECTION 6: STATS COUNTER ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-16 sm:py-24 md:py-32 bg-black border-y border-gray-900">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <AnimatedCounter target={500} suffix="+" label="Clients" />
            <AnimatedCounter target={12} suffix="" label="Expert Capsters" />
            <AnimatedCounter target={4} suffix=".9" label="Rating" />
            <AnimatedCounter target={3} suffix="" label="Tahun Berdiri" />
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ SECTION 7: THE E-CUKUR STANDARD ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="standard-section" className="py-12 sm:py-20 md:py-32 px-4 md:px-6 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <SplitTextReveal className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">
              The E-CUKUR Standard
            </SplitTextReveal>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="text-gray-400 font-light max-w-2xl mx-auto text-sm md:text-base"
            >
              Pengalaman grooming premium dengan standar kebersihan, keahlian, dan kenyamanan absolut.
            </motion.p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {[
              { icon: <ShieldCheck className="w-10 h-10 mb-4 text-white" />, title: "Sterilisasi Alat 100%", desc: "Setiap alat melalui proses sterilisasi medis (UV & cairan khusus) sebelum menyentuh kulit Anda." },
              { icon: <Scissors className="w-10 h-10 mb-4 text-white" />, title: "Capster Bersertifikasi", desc: "Seniman rambut kami melewati kurikulum ketat dan memiliki jam terbang tinggi di industri grooming." },
              { icon: <Coffee className="w-10 h-10 mb-4 text-white" />, title: "Premium Lounge", desc: "Nikmati kopi gratis, kursi pijat, dan suasana santai sembari menunggu giliran Anda." }
            ].map((feature, i) => (
              <div 
                key={i}
                className="gta-feature-card bg-black border border-gray-900 p-6 sm:p-8 hover:border-gray-700 transition-colors"
              >
                {feature.icon}
                <h3 className="text-xl font-bold uppercase tracking-wide mb-3">{feature.title}</h3>
                <p className="text-gray-500 font-light text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ SECTION 8: MASTERPIECE GALLERY (React Bits FlexCarousel + GSAP Pin) ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section 
        ref={galleryPinRef} 
        className="h-screen w-full bg-black border-t border-zinc-900 relative flex flex-col justify-between overflow-hidden py-6 sm:py-8"
      >
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 w-full shrink-0">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400 font-semibold mb-1">
                Selected Works
              </p>
              <SplitTextReveal className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white leading-none">
                Masterpiece Gallery
              </SplitTextReveal>
            </div>
            <p className="text-xs text-zinc-400 font-light max-w-md hidden sm:block">
              Scroll ke bawah untuk menelusuri 8 gaya rambut signature dari foto ke-1 hingga ke-8.
            </p>
          </div>
        </div>

        {/* FlexCarousel Interactive Container */}
        <div className="w-full h-[52vh] sm:h-[58vh] md:h-[62vh] relative my-auto">
          <FlexCarousel
            ref={carouselEngineRef}
            items={[
              { src: "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?w=1200&q=80&auto=format&fit=max", alt: "Classic Executive Fade", title: "Classic Executive Fade", subtitle: "Signature Cut" },
              { src: "https://images.unsplash.com/photo-1620331311520-246422fd82f9?w=1200&q=80&auto=format&fit=max", alt: "Modern Textured Crop", title: "Modern Textured Crop", subtitle: "Texture & Flow" },
              { src: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80&auto=format&fit=max", alt: "Precision Razor Lineup", title: "Precision Razor Lineup", subtitle: "Beard Sculpting" },
              { src: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1200&q=80&auto=format&fit=max", alt: "Textured Perm Wave", title: "Textured Perm Wave", subtitle: "Perm & Wave" },
              { src: "https://images.unsplash.com/photo-1622286342622-4bd786c2447c?w=1200&q=80&auto=format&fit=max", alt: "Hot Towel Shave", title: "Hot Towel Traditional Shave", subtitle: "Classic Shave" },
              { src: "https://images.unsplash.com/photo-1585747860019-8004e7fd11e0?w=1200&q=80&auto=format&fit=max", alt: "Platinum Ash Coloring", title: "Platinum Ash Coloring", subtitle: "Color Studio" },
              { src: "https://images.unsplash.com/photo-1621644158485-649016e3eb3b?w=1200&q=80&auto=format&fit=max", alt: "Side Part Pompadour", title: "Side Part Pompadour", subtitle: "Heritage Style" },
              { src: "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=1200&q=80&auto=format&fit=max", alt: "Low Taper Clean Cut", title: "Low Taper Clean Cut", subtitle: "Modern Clean" },
            ]}
            preset="liquid"
            intro="rise"
            cardHeight={0.52}
            gap={16}
            squeeze={0.2}
            focusOnClick
            captions
            captureWheel={false}
          />
        </div>

        {/* Footer info bar */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-zinc-900/60 shrink-0">
          <div className="text-[11px] text-zinc-500 font-light text-center sm:text-left">
            <span>Scroll vertikal untuk eksplorasi gaya &bull; 08 Karya Masterpiece</span>
          </div>
          <button 
            onClick={() => navigate('/customer/barbers')}
            className="bg-white text-black px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors"
          >
            Lihat Capster &rarr;
          </button>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ SECTION 9: CAPSTER SHOWCASE (Editorial & Clean) ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="about" ref={capsterPinRef} className="py-20 sm:py-28 md:py-36 bg-zinc-950 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400 font-semibold mb-2">
                Team & Craft
              </p>
              <SplitTextReveal className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-white">
                Meet The Artists
              </SplitTextReveal>
            </div>
            <p className="text-sm text-gray-400 font-light max-w-md leading-relaxed">
              Barber profesional kami berfokus pada kecocokan bentuk wajah, tekstur rambut, dan kenyamanan setiap klien.
            </p>
          </div>

          <div className="w-full">
            <AccordionGallery
              items={[
                { 
                  image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=1000&auto=format&fit=crop", 
                  label: "Reza — Senior Barber (8 Tahun Pengalaman)", 
                  alt: "Reza Senior Barber",
                  link: "/customer/barbers/reza",
                  onClick: () => navigate("/customer/barbers/reza")
                },
                { 
                  image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=1000&auto=format&fit=crop", 
                  label: "Bima — Color & Texture Stylist (6 Tahun Pengalaman)", 
                  alt: "Bima Color & Texture Stylist",
                  link: "/customer/barbers/bima",
                  onClick: () => navigate("/customer/barbers/bima")
                },
                { 
                  image: "https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?q=80&w=1000&auto=format&fit=crop", 
                  label: "Andi — Beard Specialist (9 Tahun Pengalaman)", 
                  alt: "Andi Beard Specialist",
                  link: "/customer/barbers/andi",
                  onClick: () => navigate("/customer/barbers/andi")
                },
                { 
                  image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1000&auto=format&fit=crop", 
                  label: "Doni — Modern Stylist (5 Tahun Pengalaman)", 
                  alt: "Doni Modern Stylist",
                  link: "/customer/barbers/doni",
                  onClick: () => navigate("/customer/barbers/doni")
                }
              ]}
              defaultIndex={0}
              expandRatio={0.52}
              trigger="hover"
              height={520}
              radius={20}
              gap={12}
              accentColor="#ffffff"
              overlayColor="#09090b"
              textColor="#ffffff"
              grayscale={true}
              parallax={0.5}
              tilt={8}
            />
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ SECTION 10: WALL OF FAME (Reviews) ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-20 sm:py-28 md:py-36 bg-black overflow-hidden relative border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400 font-semibold mb-2">
                Client Voices
              </p>
              <SplitTextReveal className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-white">
                Wall of Fame
              </SplitTextReveal>
              <p className="text-gray-400 font-light text-sm mt-3 max-w-lg">
                Ulasan langsung dari para pelanggan setia yang mempercayakan penampilan rambut mereka kepada kami.
              </p>
            </div>

            {/* Slider navigation buttons */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => scrollWall('left')}
                className="w-11 h-11 border border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors active:scale-95"
                aria-label="Previous Testimonial"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => scrollWall('right')}
                className="w-11 h-11 border border-zinc-800 bg-zinc-950 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors active:scale-95"
                aria-label="Next Testimonial"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Testimonial horizontal scroll track */}
          <div 
            ref={wallOfFameRef}
            className="flex gap-5 overflow-x-auto pb-6 pt-1 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
          >
            {[
              { 
                name: "Dimas Suryo", 
                role: "Entrepreneur", 
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop",
                review: "Konsultasi di awal sangat ngebantu. Capster beneran merhatiin arah tumbuh rambut dan bentuk rahang sebelum motong. Hasilnya selalu rapi dan tahan lama bentuknya.",
                service: "Classic Cut & Shave"
              },
              { 
                name: "Kevin Pratama", 
                role: "Creative Director", 
                avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop",
                review: "Tempatnya tenang dan privat, nggak bising. Pelayanan Mas Reza detail banget dari potongan sampai hot towel. Salah satu barbershop paling konsisten kualitasnya.",
                service: "Signature Fade"
              },
              { 
                name: "Fajar Nugraha", 
                role: "Software Engineer", 
                avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop",
                review: "Sistem booking online-nya tepat waktu, datang langsung ditangani tanpa nunggu lama. Potongan rapi dan rekomendasi produk styling-nya beneran cocok buat rambut saya.",
                service: "Executive Grooming"
              },
              { 
                name: "Bagas Wicaksono", 
                role: "Architect", 
                avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=300&auto=format&fit=crop",
                review: "Sudah langganan lebih dari setahun. Konsistensi hasil potongannya luar biasa, bahkan saat ganti gaya rambut pun transisinya selalu rapi.",
                service: "Textured Crop"
              }
            ].map((item, i) => (
              <div 
                key={i}
                className="testimonial-card w-[85vw] max-w-[340px] sm:max-w-[360px] md:max-w-[380px] bg-zinc-950 p-6 sm:p-7 border border-zinc-900 snap-center shrink-0 hover:border-zinc-700 transition-colors duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-1 text-white mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-zinc-300 font-light text-sm leading-relaxed mb-6">
                    "{item.review}"
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={item.avatar} 
                      alt={item.name} 
                      className="w-10 h-10 rounded-full object-cover border border-zinc-800 shrink-0" 
                    />
                    <div>
                      <div className="font-bold text-white text-sm">
                        {item.name}
                      </div>
                      <div className="text-zinc-500 text-xs">{item.role}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider hidden sm:inline-block">
                    {item.service}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile hint */}
          <div className="sm:hidden flex items-center justify-center gap-2 mt-4 text-xs text-zinc-600">
            <span>Geser untuk ulasan lainnya &rarr;</span>
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ━━━ FOOTER ━━━ */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer id="locations" className="border-t border-gray-900 pt-12 sm:pt-20 pb-8 sm:pb-10 px-4 sm:px-6">
        <div id="footer-content" className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12 mb-12 sm:mb-20">
          <div className="col-span-1 md:col-span-5">
            <div className="text-3xl sm:text-4xl font-black uppercase tracking-tighter mb-4 sm:mb-6">E-CUKUR STUDIO</div>
            <p className="text-gray-500 font-light max-w-sm mb-8">
              Pusat grooming pria modern. Menghadirkan kualitas potong rambut standar tinggi dengan sistem booking online tanpa ribet.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-12 h-12 rounded-full border border-gray-800 flex items-center justify-center hover:bg-white hover:text-black transition-colors font-bold text-xs">IG</a>
              <a href="#" className="w-12 h-12 rounded-full border border-gray-800 flex items-center justify-center hover:bg-white hover:text-black transition-colors font-bold text-xs">YT</a>
            </div>
          </div>
          
          <div className="col-span-1 md:col-span-3">
            <h4 className="font-bold uppercase tracking-widest text-sm mb-6">Headquarters</h4>
            <ul className="space-y-4 text-gray-500 font-light">
              <li className="flex gap-3"><MapPin className="w-5 h-5 shrink-0 text-white" /> Jl. Skena Selatan No. 99, Jakarta</li>
              <li className="flex gap-3"><Phone className="w-5 h-5 shrink-0 text-white" /> +62 811 2233 4455</li>
            </ul>
          </div>

          <div className="col-span-1 md:col-span-4 flex flex-col items-start md:items-end">
            <h4 className="font-bold uppercase tracking-widest text-sm mb-6 text-left md:text-right">Ready to Upgrade?</h4>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-black px-8 py-4 font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform"
            >
              Book Now
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto text-center border-t border-gray-900 pt-10 text-xs uppercase tracking-widest text-gray-700 font-bold">
          &copy; 2026 E-CUKUR STUDIO. All rights reserved.
        </div>
      </footer>

      {/* ━━━ Booking Modal ━━━ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-[#0a0a0a] border border-gray-800 w-full max-w-2xl relative z-10 shadow-2xl overflow-y-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200 mx-2 sm:mx-0">
            
            <div className="bg-white text-black p-5 sm:p-6 md:p-10 md:w-1/2 flex flex-col justify-between order-2 md:order-1">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter mb-4 leading-tight">Choose <br/> Your Path</h2>
                <p className="font-light text-xs sm:text-sm text-gray-600 mb-8">Pilih seniman rambut langgananmu atau ambil capster yang tersedia saat ini secara instan.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-left font-bold uppercase tracking-widest text-[10px] sm:text-xs border-b-2 border-black inline-block w-max pb-1">
                Cancel
              </button>
            </div>

            <div className="p-5 sm:p-6 md:p-10 md:w-1/2 flex flex-col justify-center gap-3 sm:gap-4 order-1 md:order-2">
              <button 
                onClick={handleSelectSpecific}
                className="w-full text-left p-6 border border-gray-800 hover:border-white bg-black hover:bg-gray-900 transition-all group"
              >
                <div className="flex items-center gap-4 mb-2">
                  <User className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors" />
                  <span className="font-bold uppercase tracking-widest text-sm">Pilih Capster</span>
                </div>
                <p className="text-xs text-gray-500 font-light leading-relaxed pl-10">Pilih artis rambut favoritmu dan sesuaikan dengan jam kedatangan.</p>
              </button>

              <button 
                onClick={handleSelectRandom}
                className="w-full text-left p-6 border border-gray-800 hover:border-white bg-black hover:bg-gray-900 transition-all group"
              >
                <div className="flex items-center gap-4 mb-2">
                  <ArrowRight className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors" />
                  <span className="font-bold uppercase tracking-widest text-sm">Fast Track</span>
                </div>
                <p className="text-xs text-gray-500 font-light leading-relaxed pl-10">Langsung bayar & dipotong oleh artis rambut yang kosong (Random).</p>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
