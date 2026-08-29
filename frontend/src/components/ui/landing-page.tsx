import { useEffect, useRef, useState, useCallback, useMemo } from "react"; 
import Globe from "@/components/ui/globe";
import { cn } from "@/lib/utils";

// Reusable ScrollGlobe component following shadcn/ui patterns
export interface ScrollGlobeProps {
  sections: {
    id: string;
    badge?: string;
    title: string;
    subtitle?: string;
    description: string;
    align?: 'left' | 'center' | 'right';
    features?: { title: string; description: string }[];
    actions?: { label: string; variant: 'primary' | 'secondary'; onClick?: () => void }[];
  }[];
  globeConfig?: {
    positions: {
      top: string;
      left: string;
      scale: number;
    }[];
  };
  className?: string;
}

const defaultGlobeConfig = {
  positions: [
    { top: "50%", left: "70%", scale: 1.8 },   // Hero: Right side, larger
    { top: "25%", left: "50%", scale: 1.1 },   // Problem: Top center, more visible
    { top: "15%", left: "88%", scale: 2.4 },   // Features: Far right, very large
    { top: "40%", left: "28%", scale: 1.5 },   // Technology: Left side
    { top: "50%", left: "50%", scale: 2.2 },   // CTA: Center, dominant backdrop
  ]
};

// Parse percentage string to number
const parsePercent = (str: string): number => parseFloat(str.replace('%', ''));

export function ScrollGlobe({ sections, globeConfig = defaultGlobeConfig, className }: ScrollGlobeProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [globeTransform, setGlobeTransform] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const animationFrameId = useRef<number | undefined>(undefined);
  
  // Pre-calculate positions for performance
  const calculatedPositions = useMemo(() => {
    return globeConfig.positions.map(pos => ({
      top: parsePercent(pos.top),
      left: parsePercent(pos.left),
      scale: pos.scale
    }));
  }, [globeConfig.positions]);

  // Simple, direct scroll tracking
  const updateScrollPosition = useCallback(() => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = Math.min(Math.max(scrollTop / (docHeight || 1), 0), 1);
    
    setScrollProgress(progress);

    // Simple section detection
    const viewportCenter = window.innerHeight / 2;
    let newActiveSection = 0;
    let minDistance = Infinity;

    sectionRefs.current.forEach((ref, index) => {
      if (ref) {
        const rect = ref.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const distance = Math.abs(sectionCenter - viewportCenter);
        
        if (distance < minDistance) {
          minDistance = distance;
          newActiveSection = index;
        }
      }
    });

    // Direct position update
    const currentPos = calculatedPositions[newActiveSection] || calculatedPositions[0];
    const transform = `translate3d(${currentPos.left}vw, ${currentPos.top}vh, 0) translate3d(-50%, -50%, 0) scale3d(${currentPos.scale}, ${currentPos.scale}, 1)`;
    
    setGlobeTransform(transform);
    setActiveSection(newActiveSection);
  }, [calculatedPositions]);

  // Throttled scroll handler with RAF
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        animationFrameId.current = requestAnimationFrame(() => {
          updateScrollPosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateScrollPosition(); // Initial call
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [updateScrollPosition]);

  // Initial globe position
  useEffect(() => {
    const initialPos = calculatedPositions[0];
    const initialTransform = `translate3d(${initialPos.left}vw, ${initialPos.top}vh, 0) translate3d(-50%, -50%, 0) scale3d(${initialPos.scale}, ${initialPos.scale}, 1)`;
    setGlobeTransform(initialTransform);
  }, [calculatedPositions]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full max-w-screen overflow-x-hidden min-h-screen bg-slate-950 text-white selection:bg-indigo-500 selection:text-white",
        className
      )}
    >
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-white/10 z-50">
        <div 
          className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-amber-400 will-change-transform shadow-lg"
          style={{ 
            transform: `scaleX(${scrollProgress})`,
            transformOrigin: 'left center',
            transition: 'transform 0.15s ease-out',
            filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))'
          }}
        />
      </div>

      {/* Enhanced Navigation with auto-hiding labels */}
      <div className="hidden sm:flex fixed right-2 sm:right-4 lg:right-8 top-1/2 -translate-y-1/2 z-40">
        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          {sections.map((section, index) => (
            <div key={index} className="relative group">
              <div
                className={cn(
                  "nav-label absolute right-5 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2",
                  "px-2.5 sm:px-3.5 lg:px-4 py-1 sm:py-1.5 lg:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap",
                  "bg-slate-950/95 backdrop-blur-xl border border-white/20 shadow-2xl z-50 text-white",
                  activeSection === index ? "animate-fadeOut" : "opacity-0"
                )}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-sky-400 animate-pulse" />
                  <span className="text-xs sm:text-sm font-display">
                    {section.badge || `Section ${index + 1}`}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  sectionRefs.current[index]?.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'center'
                  });
                }}
                className={cn(
                  "relative w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-3.5 lg:h-3.5 rounded-full border-2 transition-all duration-300 hover:scale-125 cursor-pointer",
                  "before:absolute before:inset-0 before:rounded-full before:transition-all before:duration-300",
                  activeSection === index 
                    ? "bg-sky-400 border-sky-300 shadow-lg before:animate-ping before:bg-sky-400/30" 
                    : "bg-transparent border-white/30 hover:border-sky-400/60 hover:bg-sky-400/10"
                )}
                aria-label={`Go to ${section.badge || `section ${index + 1}`}`}
              />
            </div>
          ))}
        </div>
        
        {/* Navigation vertical line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 lg:w-px bg-gradient-to-b from-transparent via-sky-400/30 to-transparent -translate-x-1/2 -z-10" />
      </div>

      {/* Ultra-smooth Globe with responsive scaling — globe rendered large */}
      <div
        className="fixed z-10 pointer-events-none will-change-transform transition-all duration-[1400ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{
          transform: globeTransform,
          filter: `opacity(${activeSection === 4 ? 0.45 : 0.88}) drop-shadow(0 0 80px rgba(56, 189, 248, 0.35))`,
        }}
      >
        <div className="scale-[1.5] sm:scale-[1.8] lg:scale-[2.2]">
          <Globe />
        </div>
      </div>

      {/* Dynamic sections */}
      {sections.map((section, index) => (
        <section
          key={section.id}
          ref={(el) => { sectionRefs.current[index] = el; }}
          className={cn(
            "relative min-h-screen flex flex-col justify-center px-6 sm:px-8 md:px-12 lg:px-16 z-20 py-16 sm:py-20 lg:py-24",
            "w-full max-w-full overflow-hidden",
            section.align === 'center' && "items-center text-center",
            section.align === 'right' && "items-end text-right",
            section.align !== 'center' && section.align !== 'right' && "items-start text-left"
          )}
        >
          <div className={cn(
            "w-full max-w-sm sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl will-change-transform transition-all duration-700",
            "opacity-100 translate-y-0"
          )}>
            
            {/* Section Badge */}
            {section.badge && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-extrabold text-emerald-300 mb-4 backdrop-blur-xl shadow-lg font-display">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{section.badge}</span>
              </div>
            )}

            {/* Title & Subtitle */}
            <h1 className={cn(
              "font-extrabold mb-6 sm:mb-8 leading-[1.1] tracking-tight font-display text-white",
              index === 0 
                ? "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl" 
                : "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
            )}>
              {section.subtitle ? (
                <div className="space-y-2">
                  <div className="bg-gradient-to-r from-white via-white/95 to-white/80 bg-clip-text text-transparent">
                    {section.title}
                  </div>
                  <div className="text-sky-300/90 text-[0.55em] sm:text-[0.65em] font-semibold tracking-wide">
                    {section.subtitle}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-white via-white/95 to-white/80 bg-clip-text text-transparent">
                  {section.title}
                </div>
              )}
            </h1>
            
            {/* Description */}
            <div className={cn(
              "text-white/80 leading-relaxed mb-8 sm:mb-10 text-base sm:text-lg lg:text-xl font-normal",
              section.align === 'center' ? "max-w-3xl mx-auto text-center" : "max-w-2xl"
            )}>
              <p className="mb-4">{section.description}</p>
              {index === 0 && (
                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-white/60 mt-4 sm:mt-6">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    <span className="font-semibold text-white/80">Live Weather AI</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
                    <span className="font-semibold text-white/80">Scroll to Discover</span>
                  </div>
                </div>
              )}
            </div>

            {/* Features Grid */}
            {section.features && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 sm:mb-10 max-w-4xl">
                {section.features.map((feature, featureIndex) => (
                  <div 
                    key={feature.title}
                    className="p-5 sm:p-6 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl hover:bg-white/10 hover:border-sky-400/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
                    style={{ animationDelay: `${featureIndex * 0.1}s` }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <h3 className="font-extrabold text-white text-base sm:text-lg font-display group-hover:text-sky-300 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-white/70 leading-relaxed text-xs sm:text-sm">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            {section.actions && (
              <div className={cn(
                "flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-2",
                section.align === 'center' && "justify-center",
                section.align === 'right' && "justify-end",
                (!section.align || section.align === 'left') && "justify-start"
              )}>
                {section.actions.map((action, actionIndex) => (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    className={cn(
                      "px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] text-sm sm:text-base cursor-pointer shadow-xl",
                      action.variant === 'primary' 
                        ? "bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white shadow-sky-500/25 border border-white/20" 
                        : "border border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl"
                    )}
                    style={{ animationDelay: `${actionIndex * 0.1 + 0.2}s` }}
                  >
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

// WeatherGPT Landing Page Component
export default function GlobeScrollDemo({ onLaunchApp }: { onLaunchApp?: () => void }) {
  const handleLaunch = () => {
    if (onLaunchApp) {
      onLaunchApp();
    } else {
      const appEl = document.getElementById('weathergpt-dashboard') || document.getElementById('root');
      appEl?.scrollIntoView({ behavior: 'smooth' });
    }
  };



  const handleDocs = () => {
    window.open('http://127.0.0.1:8000/docs', '_blank');
  };

  const weatherGPTSections = [
    {
      id: "hero",
      badge: "SIH 26068 · Ministry of Earth Sciences",
      title: "WeatherGPT",
      subtitle: "AI Weather Intelligence for India",
      description: "India's first conversational AI weather platform — turning complex meteorological data into clear, actionable guidance in your own language. Built for farmers, disaster managers, aviation and marine operators, and every citizen who needs to know what the sky holds next.",
      align: "left" as const,
      actions: [
        { label: "Try WeatherGPT", variant: "primary" as const, onClick: handleLaunch },
      ]
    },
    {
      id: "problem",
      badge: "The Problem",
      title: "Weather Data Shouldn't Be This Scattered",
      description: "Forecasts, bulletins, satellite feeds, and warnings live across dozens of disconnected portals. Farmers can't get a straight answer about tomorrow's rain. Disaster managers can't get alerts fast enough. WeatherGPT brings it all into one conversation.",
      align: "center" as const,
    },
    {
      id: "features",
      badge: "What It Does",
      title: "Built for Every",
      subtitle: "Kind of User",
      description: "One assistant, many decision-makers — WeatherGPT adapts its answers to who's asking.",
      align: "left" as const,
      features: [
        { title: "🌾 Farmers", description: "Crop-specific advisories — irrigation timing, pesticide safety windows, sowing and harvest guidance" },
        { title: "✈️ Aviation & Marine", description: "Wind shear, visibility, wave height, and safety briefings tailored to operational needs" },
        { title: "🚨 Disaster Response", description: "Real-time extreme weather alerts — heavy rain, heatwave, cyclone-strength winds, flood risk" },
        { title: "🗣️ Every Indian Citizen", description: "Ask in Tamil, Hindi, English, and more — voice or text, answered in plain language" }
      ]
    },
    {
      id: "technology",
      badge: "How It Works",
      title: "Grounded in Real Data,",
      subtitle: "Not Guesses",
      description: "Every answer is generated from live meteorological data — never from memory. WeatherGPT combines real-time forecasting APIs, a custom threshold-based alert engine styled on IMD's severity system, and resilient AI infrastructure with automatic failover, so it keeps working even when one data source doesn't.",
      align: "center" as const,
    },
    {
      id: "cta",
      badge: "Ready When You Are",
      title: "The Weather, Finally",
      subtitle: "Making Sense",
      description: "From a farmer in Madurai to a researcher tracking climate trends — WeatherGPT speaks everyone's language. Ask your first question.",
      align: "center" as const,
      actions: [
        { label: "Launch WeatherGPT", variant: "primary" as const, onClick: handleLaunch },
        { label: "Read the Docs", variant: "secondary" as const, onClick: handleDocs }
      ]
    }
  ];

  return (
    <ScrollGlobe 
      sections={weatherGPTSections}
      className="bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950"
    />
  );
}
