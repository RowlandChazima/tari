'use client';

import React, { useState, useId, useRef, useEffect } from 'react';
import { ProductDetails } from './product-data';

interface CurtainPreviewProps {
  product: ProductDetails;
}

// Named lighting constants (Tuned by eye for dramatic day contrast while preserving night behavior)
export const MIN_AMBIENT = 0.08; // Baseline floor when room is dimmed by closed curtains
export const DIM_CURVE_EXPONENT = 0.85; // Exponent for ambient room dimming curve: (1 - lightPassing)^DIM_CURVE_EXPONENT
export const NIGHT_AMBIENT_LEVEL = 0.36; // Warm cozy evening interior lamplight level

export function CurtainPreview({ product }: CurtainPreviewProps) {
  // Continuous openness: 0 = fully drawn/closed across window, 1 = fully open/stacked at sides
  const [openness, setOpenness] = useState<number>(0.2);
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'evening'>('day');
  const [showScaleReference, setShowScaleReference] = useState<boolean>(true);
  const sliderId = useId();

  // Animation frame ref for quick "Open" / "Closed" buttons
  const animFrameRef = useRef<number | null>(null);

  // Cancel any running programmatic animation
  const cancelAnimation = () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Programmatic animation over ~300ms using ease-out curve, respecting reduced motion
  const animateToOpenness = (target: number) => {
    cancelAnimation();

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpenness(target);
      return;
    }

    const startVal = openness;
    const diff = target - startVal;
    if (Math.abs(diff) < 0.001) return;

    const duration = 300; // ms
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      const nextVal = startVal + diff * easeOutProgress;

      setOpenness(nextVal);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setOpenness(target);
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);
  };

  // Architectural metric scale: 1.6 px per cm
  // Allows 300cm high wall + 420cm wide room elevation to fit standard screens
  const PX_PER_CM = 1.6;

  // Scene dimensions in cm
  const SCENE_WIDTH_CM = 420;
  const SCENE_HEIGHT_CM = 300; // Standard 3.0m ceiling height

  // Window coordinates in cm
  const WINDOW_WIDTH_CM = 220;
  const WINDOW_HEIGHT_CM = 190;
  const WINDOW_X_CM = 140; // Centered
  const WINDOW_Y_CM = 45; // 45cm from ceiling

  // Curtain coordinates & dimensions in cm
  const ROD_Y_CM = WINDOW_Y_CM - 12;
  const ROD_WIDTH_CM = 250;
  const ROD_X_CM = WINDOW_X_CM - (ROD_WIDTH_CM - WINDOW_WIDTH_CM) / 2;

  // Real product drop
  const CURTAIN_DROP_CM = product.dimensions.dropCm; // 240cm
  const CURTAIN_FLAT_WIDTH_CM = product.dimensions.widthCm; // 260cm total flat fabric

  // Minimum stacked width when drawn open
  const STACK_MIN_WIDTH_CM = 26;
  const DRAWN_PANEL_WIDTH_CM = (ROD_WIDTH_CM / 2) + 4;

  // Current visual width of each panel based on continuous openness (pure generated folds, no scaleX):
  const currentPanelWidthCm =
    DRAWN_PANEL_WIDTH_CM - (DRAWN_PANEL_WIDTH_CM - STACK_MIN_WIDTH_CM) * openness;

  // Real physical light transmission through the fabric weave (Fabric Property, e.g. 0.14)
  const fabricLightThrough = product.lightTransmission;
  
  // Total fraction of daylight passing through the window opening + fabric:
  const lightPassing = openness + (1 - openness) * fabricLightThrough;

  const isDay = timeOfDay === 'day';

  // 1. OUTDOOR SCENE DETAIL FADE IN DAY MODE:
  // When the curtain covers the window, outdoor scene detail (sky, sun, skyline, acacia tree)
  // fades according to physical fabricLightThrough. For a 14% curtain (0.14), scene detail
  // drops to almost zero when closed: openness + (1 - openness) * (fabricLightThrough^1.8) ≈ 0.029.
  const daySceneDetailOpacity = openness + (1 - openness) * Math.pow(fabricLightThrough, 1.8);

  // 2. FABRIC OVER THE WINDOW BACKLIT GLOW:
  // When closed against daytime sun, light diffuses into the fabric slub weave,
  // creating a subtle warm translucent backlit glow across the curtain aperture.
  const fabricBacklitGlowOpacity = isDay
    ? (1 - openness) * Math.min(0.35, Math.sqrt(fabricLightThrough) * 0.75)
    : 0;

  // 3. AMBIENT ROOM LIGHTING & DARKENING (TUNED BY EYE):
  // When fully open (openness = 1, lightPassing = 1) -> dimFactor = 0 -> ambientDay = 1.0 (sun-drenched room)
  // When fully closed (openness = 0, lightPassing = 0.14) -> dimFactor = (1 - 0.14)^0.85 ≈ 0.88
  // ambientDay drops down to ~0.19. The room darkness is unmistakably deep and obvious at a glance.
  const dimFactor = Math.pow(1 - lightPassing, DIM_CURVE_EXPONENT);
  const ambientDay = Math.max(MIN_AMBIENT, 1 - (1 - MIN_AMBIENT) * dimFactor);
  
  // Dark shade overlay opacity over wall, floor moulding, and person:
  // Fades from 0 (when fully open) to 0.62 (when fully closed in daytime)
  const dayDarkeningShadeOpacity = (1 - ambientDay) * 0.72;

  // Night mode: privacy increases with curtain closure without plunge into darkness
  const ambientNight = NIGHT_AMBIENT_LEVEL + (1 - openness) * 0.05;
  const nightOverlayOpacity = ambientNight * 0.52;

  // Floor sunlight patch: prominent golden beam (up to 0.55 opacity) when open; shrinks and drops to 0.01 when closed.
  const sunPatchOpacity = isDay ? Math.pow(lightPassing, 1.6) * 0.55 : 0;
  // Floor patch horizontal shrink factor as curtain closes:
  const sunPatchSpreadCm = 45 * Math.pow(lightPassing, 0.8);

  // Window perimeter halo:
  const dayWindowGlowOpacity = Math.max(0.04, Math.pow(lightPassing, 1.2) * 0.55);
  const nightCityGlowOpacity = Math.max(0.08, openness * 0.92);

  // Fabric render opacity: solid opaque in night mode; backlit in day mode
  const dayFabricRenderOpacity = Math.max(0.5, Math.min(0.98, 1 - Math.sqrt(fabricLightThrough) * 0.65));
  const fabricRenderOpacity = isDay ? dayFabricRenderOpacity : 0.96;

  // Base wall, trim and floor fills
  const wallFill = isDay ? '#F6F3EE' : '#1F1B18';
  const wallStroke = isDay ? '#E2DDD5' : '#2C2723';
  const floorFill = isDay ? '#D6CEC2' : '#181513';

  // Fold generation: procedural vertical sine waves with shading
  const foldCount = 7;
  const foldShadowIntensity = 0.25 + 0.55 * openness;

  // Metric conversion helper
  const toPx = (cm: number) => cm * PX_PER_CM;

  // Precomputed pixel values
  const sceneWidthPx = toPx(SCENE_WIDTH_CM);
  const sceneHeightPx = toPx(SCENE_HEIGHT_CM);
  const windowXPx = toPx(WINDOW_X_CM);
  const windowYPx = toPx(WINDOW_Y_CM);
  const windowWidthPx = toPx(WINDOW_WIDTH_CM);
  const windowHeightPx = toPx(WINDOW_HEIGHT_CM);
  const rodXPx = toPx(ROD_X_CM);
  const rodYPx = toPx(ROD_Y_CM);
  const rodWidthPx = toPx(ROD_WIDTH_CM);
  const curtainDropPx = toPx(CURTAIN_DROP_CM);
  const currentPanelWidthPx = toPx(currentPanelWidthCm);

  // Left & Right panel positions
  const leftPanelLeftPx = rodXPx;
  const rightPanelLeftPx = rodXPx + rodWidthPx - currentPanelWidthPx;

  // Percentage closed for single label ("80% closed" style)
  const percentClosed = Math.round((1 - openness) * 100);

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Visualizer Canvas Card */}
      <div className="relative rounded-2xl overflow-hidden border border-stone-200/80 bg-stone-100 shadow-sm transition-colors duration-300 motion-reduce:transition-none">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-stone-50 border-b border-stone-200/70 text-xs font-medium text-stone-700">
          <div className="flex items-center gap-2">
            <span className="text-stone-700 font-sans tabular-nums text-xs font-medium tracking-tight">
              Ceiling: 3.0m · Curtain Drop: {product.dimensions.dropCm}cm
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTimeOfDay(isDay ? 'evening' : 'day')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-md border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 active:scale-[0.97] transition-transform duration-100 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-amber-600 focus-visible:outline-offset-1"
              aria-label={`Toggle lighting. Current: ${timeOfDay}`}
            >
              <span>{isDay ? '☀️ Nairobi Daylight' : '🌙 Evening Room'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowScaleReference(!showScaleReference)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-md border active:scale-[0.97] transition-transform duration-100 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-amber-600 focus-visible:outline-offset-1 ${
                showScaleReference
                  ? 'bg-stone-800 text-stone-50 border-stone-800'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
              aria-pressed={showScaleReference}
            >
              <span className="tabular-nums">🧍 Person for Scale (175cm)</span>
            </button>
          </div>
        </div>

        {/* Scaled SVG Architectural Elevation Scene */}
        <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[520px] flex items-center justify-center select-none bg-stone-900/5">
          <svg
            viewBox={`0 0 ${sceneWidthPx} ${sceneHeightPx}`}
            className="w-full h-full object-contain"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`Curtain preview showing ${product.name} drawn ${percentClosed}% closed across the window.`}
          >
            <defs>
              {/* Slub fabric flat procedural texture */}
              <pattern
                id="flat-linen-weave"
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <rect width="16" height="16" fill={product.colorHex} />
                <path
                  d="M0 4h16 M0 12h16"
                  stroke="rgba(0,0,0,0.08)"
                  strokeWidth="1.2"
                />
                <path
                  d="M4 0v16 M12 0v16"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1.2"
                />
                <circle cx="8" cy="8" r="0.8" fill="rgba(0,0,0,0.1)" />
              </pattern>

              {/* Shading gradient for vertical gathered curtain folds */}
              <linearGradient id="fold-shading" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#000000" stopOpacity={foldShadowIntensity * 0.8} />
                <stop offset="25%" stopColor="#ffffff" stopOpacity="0.18" />
                <stop offset="50%" stopColor="#000000" stopOpacity={foldShadowIntensity * 0.9} />
                <stop offset="75%" stopColor="#ffffff" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#000000" stopOpacity={foldShadowIntensity * 0.8} />
              </linearGradient>

              {/* Window glass clip */}
              <clipPath id="window-glass-clip">
                <rect
                  x={windowXPx}
                  y={windowYPx}
                  width={windowWidthPx}
                  height={windowHeightPx}
                />
              </clipPath>
            </defs>

            {/* 1. ROOM WALL BACKGROUND */}
            <rect width={sceneWidthPx} height={sceneHeightPx} fill={wallFill} />

            {/* Architectural baseboard moulding */}
            <rect
              x="0"
              y={sceneHeightPx - toPx(15)}
              width={sceneWidthPx}
              height={toPx(15)}
              fill={floorFill}
            />
            <line
              x1="0"
              y1={sceneHeightPx - toPx(15)}
              x2={sceneWidthPx}
              y2={sceneHeightPx - toPx(15)}
              stroke={wallStroke}
              strokeWidth="2"
            />

            {/* 2. FLOOR SUNLIGHT PATCH (Shrinks and dims with lightPassing in day mode) */}
            <polygon
              points={`
                ${windowXPx - toPx(sunPatchSpreadCm * 0.5)},${sceneHeightPx - toPx(15)}
                ${windowXPx + windowWidthPx + toPx(sunPatchSpreadCm * 0.5)},${sceneHeightPx - toPx(15)}
                ${windowXPx + windowWidthPx + toPx(sunPatchSpreadCm)},${sceneHeightPx}
                ${windowXPx - toPx(sunPatchSpreadCm)},${sceneHeightPx}
              `}
              fill="#FEF08A"
              opacity={sunPatchOpacity}
              style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}
            />

            {/* 3. WINDOW ARCHITRAVE & OUTDOOR APERTURE */}
            <rect
              x={windowXPx - toPx(6)}
              y={windowYPx - toPx(6)}
              width={windowWidthPx + toPx(12)}
              height={windowHeightPx + toPx(12)}
              fill={isDay ? '#EAE5DC' : '#2A2522'}
              stroke={isDay ? '#C9C2B5' : '#443D38'}
              strokeWidth="2"
              rx="2"
            />

            {/* Outdoor View through Glass Aperture */}
            <g clipPath="url(#window-glass-clip)">
              {/* NIGHT SKY LAYER */}
              <g
                style={{
                  opacity: isDay ? 0 : 1,
                  transition: 'opacity 250ms cubic-bezier(0.23, 1, 0.32, 1)',
                }}
                className="motion-reduce:transition-none"
              >
                <rect
                  x={windowXPx}
                  y={windowYPx}
                  width={windowWidthPx}
                  height={windowHeightPx}
                  fill="#0B1120"
                />
                <g opacity={nightCityGlowOpacity}>
                  <circle
                    cx={windowXPx + windowWidthPx * 0.75}
                    cy={windowYPx + windowHeightPx * 0.28}
                    r={toPx(12)}
                    fill="#E2E8F0"
                    opacity="0.9"
                  />
                  <path
                    d={`M ${windowXPx} ${windowYPx + windowHeightPx} 
                        L ${windowXPx} ${windowYPx + windowHeightPx * 0.65}
                        l ${toPx(20)} 0 l 0 ${toPx(-15)} l ${toPx(15)} 0 l 0 ${toPx(15)}
                        l ${toPx(35)} 0 l 0 ${toPx(-25)} l ${toPx(22)} 0 l 0 ${toPx(25)}
                        l ${toPx(40)} 0 l 0 ${toPx(-10)} l ${toPx(30)} 0 l 0 ${toPx(10)}
                        L ${windowXPx + windowWidthPx} ${windowYPx + windowHeightPx * 0.7}
                        L ${windowXPx + windowWidthPx} ${windowYPx + windowHeightPx} Z`}
                    fill="#1E293B"
                    opacity="0.85"
                  />
                  <circle cx={windowXPx + toPx(30)} cy={windowYPx + windowHeightPx * 0.72} r="1.5" fill="#FDE047" opacity="0.8" />
                  <circle cx={windowXPx + toPx(75)} cy={windowYPx + windowHeightPx * 0.68} r="1.5" fill="#FDE047" opacity="0.8" />
                  <circle cx={windowXPx + toPx(130)} cy={windowYPx + windowHeightPx * 0.74} r="1.5" fill="#FDE047" opacity="0.8" />
                  <ellipse
                    cx={windowXPx + toPx(45)}
                    cy={windowYPx + windowHeightPx * 0.72}
                    rx={toPx(36)}
                    ry={toPx(14)}
                    fill="#064E3B"
                    opacity="0.75"
                  />
                  <rect
                    x={windowXPx + toPx(42)}
                    y={windowYPx + windowHeightPx * 0.72}
                    width={toPx(5)}
                    height={toPx(45)}
                    fill="#022C22"
                  />
                </g>
              </g>

              {/* DAY SKY LAYER: Outdoor scene fades with lightTransmission so 14% curtain shows almost zero detail */}
              <g
                style={{
                  opacity: isDay ? 1 : 0,
                  transition: 'opacity 250ms cubic-bezier(0.23, 1, 0.32, 1)',
                }}
                className="motion-reduce:transition-none"
              >
                {/* Base outdoor sky backdrop */}
                <rect
                  x={windowXPx}
                  y={windowYPx}
                  width={windowWidthPx}
                  height={windowHeightPx}
                  fill="#7DD3FC"
                  opacity={daySceneDetailOpacity}
                />
                {/* Nairobi Sun, Skyline, and Acacia Tree */}
                <g opacity={daySceneDetailOpacity}>
                  <circle
                    cx={windowXPx + windowWidthPx * 0.75}
                    cy={windowYPx + windowHeightPx * 0.28}
                    r={toPx(16)}
                    fill="#FDE047"
                    opacity="0.95"
                  />
                  <path
                    d={`M ${windowXPx} ${windowYPx + windowHeightPx} 
                        L ${windowXPx} ${windowYPx + windowHeightPx * 0.65}
                        l ${toPx(20)} 0 l 0 ${toPx(-15)} l ${toPx(15)} 0 l 0 ${toPx(15)}
                        l ${toPx(35)} 0 l 0 ${toPx(-25)} l ${toPx(22)} 0 l 0 ${toPx(25)}
                        l ${toPx(40)} 0 l 0 ${toPx(-10)} l ${toPx(30)} 0 l 0 ${toPx(10)}
                        L ${windowXPx + windowWidthPx} ${windowYPx + windowHeightPx * 0.7}
                        L ${windowXPx + windowWidthPx} ${windowYPx + windowHeightPx} Z`}
                    fill="#38BDF8"
                    opacity="0.55"
                  />
                  <ellipse
                    cx={windowXPx + toPx(45)}
                    cy={windowYPx + windowHeightPx * 0.72}
                    rx={toPx(36)}
                    ry={toPx(14)}
                    fill="#15803D"
                    opacity="0.8"
                  />
                  <rect
                    x={windowXPx + toPx(42)}
                    y={windowYPx + windowHeightPx * 0.72}
                    width={toPx(5)}
                    height={toPx(45)}
                    fill="#14532D"
                  />
                </g>

                {/* Diffuse daylight glass glow when scene detail is faded out */}
                <rect
                  x={windowXPx}
                  y={windowYPx}
                  width={windowWidthPx}
                  height={windowHeightPx}
                  fill="#E0F2FE"
                  opacity={0.3 * (1 - daySceneDetailOpacity)}
                />
              </g>

              {/* Window Mullions / Panes */}
              <line
                x1={windowXPx + windowWidthPx / 2}
                y1={windowYPx}
                x2={windowXPx + windowWidthPx / 2}
                y2={windowYPx + windowHeightPx}
                stroke={isDay ? '#FFFFFF' : '#334155'}
                strokeWidth="4"
              />
              <line
                x1={windowXPx}
                y1={windowYPx + windowHeightPx * 0.45}
                x2={windowXPx + windowWidthPx}
                y2={windowYPx + windowHeightPx * 0.45}
                stroke={isDay ? '#FFFFFF' : '#334155'}
                strokeWidth="3"
              />
            </g>

            {/* 4. WINDOW PERIMETER GLOW */}
            <rect
              x={windowXPx - toPx(8)}
              y={windowYPx - toPx(8)}
              width={windowWidthPx + toPx(16)}
              height={windowHeightPx + toPx(16)}
              fill="#FEF3C7"
              opacity={isDay ? dayWindowGlowOpacity : 0.04}
              style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}
            />

            {/* 5. CURTAIN ROD & MOUNTING BRACKETS */}
            <rect
              x={rodXPx}
              y={rodYPx}
              width={rodWidthPx}
              height={toPx(3.2)}
              fill={isDay ? '#78350F' : '#451A03'}
              rx="1.5"
            />
            <circle
              cx={rodXPx - toPx(2)}
              cy={rodYPx + toPx(1.6)}
              r={toPx(3)}
              fill={isDay ? '#92400E' : '#78350F'}
            />
            <circle
              cx={rodXPx + rodWidthPx + toPx(2)}
              cy={rodYPx + toPx(1.6)}
              r={toPx(3)}
              fill={isDay ? '#92400E' : '#78350F'}
            />

            {/* 6. PROCEDURAL 2D CURTAIN PANELS */}
            {/* LEFT DRAPE PANEL */}
            <g transform={`translate(${leftPanelLeftPx}, ${rodYPx + toPx(2)})`}>
              <rect
                x="0"
                y="0"
                width={currentPanelWidthPx}
                height={curtainDropPx}
                fill="url(#flat-linen-weave)"
                opacity={fabricRenderOpacity}
              />

              {/* Slight warm backlit glow across fabric over window in daylight */}
              {fabricBacklitGlowOpacity > 0 && (
                <rect
                  x="0"
                  y="0"
                  width={currentPanelWidthPx}
                  height={curtainDropPx}
                  fill="#FEF3C7"
                  opacity={fabricBacklitGlowOpacity}
                  style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}
                />
              )}

              {Array.from({ length: foldCount }).map((_, idx) => {
                const foldWidth = currentPanelWidthPx / foldCount;
                const foldX = idx * foldWidth;
                return (
                  <rect
                    key={`l-fold-${idx}`}
                    x={foldX}
                    y="0"
                    width={foldWidth}
                    height={curtainDropPx}
                    fill="url(#fold-shading)"
                    style={{ mixBlendMode: 'multiply' }}
                  />
                );
              })}

              {Array.from({ length: Math.max(3, Math.round(5 - openness * 2)) }).map(
                (_, idx, arr) => {
                  const ringX =
                    arr.length > 1
                      ? (idx / (arr.length - 1)) * (currentPanelWidthPx - toPx(6)) + toPx(3)
                      : currentPanelWidthPx / 2;
                  return (
                    <circle
                      key={`l-ring-${idx}`}
                      cx={ringX}
                      cy={toPx(2)}
                      r={toPx(2.2)}
                      fill="#78350F"
                      stroke="#FDE68A"
                      strokeWidth="1"
                    />
                  );
                }
              )}

              <path
                d={`M 0 ${curtainDropPx} 
                    q ${currentPanelWidthPx * 0.25} ${toPx(1.5 + openness * 2)}, ${
                  currentPanelWidthPx * 0.5
                } 0 
                    t ${currentPanelWidthPx * 0.5} 0 
                    L ${currentPanelWidthPx} ${curtainDropPx + toPx(1.5)} 
                    L 0 ${curtainDropPx + toPx(1.5)} Z`}
                fill={product.colorHex}
                opacity="0.9"
              />
            </g>

            {/* RIGHT DRAPE PANEL */}
            <g transform={`translate(${rightPanelLeftPx}, ${rodYPx + toPx(2)})`}>
              <rect
                x="0"
                y="0"
                width={currentPanelWidthPx}
                height={curtainDropPx}
                fill="url(#flat-linen-weave)"
                opacity={fabricRenderOpacity}
              />

              {/* Slight warm backlit glow across fabric over window in daylight */}
              {fabricBacklitGlowOpacity > 0 && (
                <rect
                  x="0"
                  y="0"
                  width={currentPanelWidthPx}
                  height={curtainDropPx}
                  fill="#FEF3C7"
                  opacity={fabricBacklitGlowOpacity}
                  style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}
                />
              )}

              {Array.from({ length: foldCount }).map((_, idx) => {
                const foldWidth = currentPanelWidthPx / foldCount;
                const foldX = idx * foldWidth;
                return (
                  <rect
                    key={`r-fold-${idx}`}
                    x={foldX}
                    y="0"
                    width={foldWidth}
                    height={curtainDropPx}
                    fill="url(#fold-shading)"
                    style={{ mixBlendMode: 'multiply' }}
                  />
                );
              })}

              {Array.from({ length: Math.max(3, Math.round(5 - openness * 2)) }).map(
                (_, idx, arr) => {
                  const ringX =
                    arr.length > 1
                      ? (idx / (arr.length - 1)) * (currentPanelWidthPx - toPx(6)) + toPx(3)
                      : currentPanelWidthPx / 2;
                  return (
                    <circle
                      key={`r-ring-${idx}`}
                      cx={ringX}
                      cy={toPx(2)}
                      r={toPx(2.2)}
                      fill="#78350F"
                      stroke="#FDE68A"
                      strokeWidth="1"
                    />
                  );
                }
              )}

              <path
                d={`M 0 ${curtainDropPx} 
                    q ${currentPanelWidthPx * 0.25} ${toPx(1.5 + openness * 2)}, ${
                  currentPanelWidthPx * 0.5
                } 0 
                    t ${currentPanelWidthPx * 0.5} 0 
                    L ${currentPanelWidthPx} ${curtainDropPx + toPx(1.5)} 
                    L 0 ${curtainDropPx + toPx(1.5)} Z`}
                fill={product.colorHex}
                opacity="0.9"
              />
            </g>

            {/* 7. SCALE REFERENCE: Standard Adult Person (175cm) */}
            {showScaleReference && (
              <g
                transform={`translate(${toPx(45)}, ${sceneHeightPx - toPx(15) - toPx(175)})`}
                opacity={isDay ? 0.75 : 0.6}
              >
                <circle cx={toPx(12)} cy={toPx(12)} r={toPx(10)} fill="#475569" />
                <path
                  d={`M ${toPx(4)} ${toPx(27)} 
                      C ${toPx(4)} ${toPx(24)}, ${toPx(20)} ${toPx(24)}, ${toPx(20)} ${toPx(27)}
                      L ${toPx(22)} ${toPx(85)}
                      L ${toPx(18)} ${toPx(175)}
                      L ${toPx(13)} ${toPx(175)}
                      L ${toPx(12)} ${toPx(95)}
                      L ${toPx(11)} ${toPx(175)}
                      L ${toPx(6)} ${toPx(175)}
                      L ${toPx(2)} ${toPx(85)}
                      Z`}
                  fill="#475569"
                />
                <text
                  x={toPx(12)}
                  y={toPx(-8)}
                  textAnchor="middle"
                  fontSize="11"
                  className="font-sans tabular-nums"
                  fill="#475569"
                  fontWeight="600"
                >
                  Adult (175cm)
                </text>
                <line
                  x1={toPx(12)}
                  y1={toPx(-4)}
                  x2={toPx(12)}
                  y2={0}
                  stroke="#475569"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              </g>
            )}

            {/* 8. AMBIENT LIGHT & SHADE OVERLAYS */}
            {/* A. DAY DARKENING SHADE: Directly darkens wall, floor moulding, and person as curtains close */}
            {isDay && (
              <rect
                x="0"
                y="0"
                width={sceneWidthPx}
                height={sceneHeightPx}
                fill="#1C1917"
                opacity={dayDarkeningShadeOpacity}
                style={{
                  mixBlendMode: 'multiply',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* B. NIGHT AMBIENT LAYER: Cozy interior lamp wash (unchanged) */}
            <rect
              x="0"
              y="0"
              width={sceneWidthPx}
              height={sceneHeightPx}
              fill="#F59E0B"
              opacity={isDay ? 0 : nightOverlayOpacity}
              style={{
                mixBlendMode: 'soft-light',
                pointerEvents: 'none',
                transition: 'opacity 250ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
              className="motion-reduce:transition-none"
            />

            {/* C. DAY SUNLIGHT BLOOM: Warm sun radiance present when curtains are open */}
            {isDay && (
              <rect
                x="0"
                y="0"
                width={sceneWidthPx}
                height={sceneHeightPx}
                fill="#FEF3C7"
                opacity={ambientDay * 0.45}
                style={{
                  mixBlendMode: 'soft-light',
                  pointerEvents: 'none',
                }}
              />
            )}

            {/* 9. ARCHITECTURAL DIMENSION CALLOUT LINES */}
            <g opacity="0.8">
              <line
                x1={rodXPx + rodWidthPx + toPx(12)}
                y1={rodYPx}
                x2={rodXPx + rodWidthPx + toPx(12)}
                y2={rodYPx + curtainDropPx}
                stroke="#B45309"
                strokeWidth="1.5"
              />
              <line
                x1={rodXPx + rodWidthPx + toPx(8)}
                y1={rodYPx}
                x2={rodXPx + rodWidthPx + toPx(16)}
                y2={rodYPx}
                stroke="#B45309"
                strokeWidth="1.5"
              />
              <line
                x1={rodXPx + rodWidthPx + toPx(8)}
                y1={rodYPx}
                x2={rodXPx + rodWidthPx + toPx(16)}
                y2={rodYPx + curtainDropPx}
                stroke="#B45309"
                strokeWidth="1.5"
              />
              <text
                x={rodXPx + rodWidthPx + toPx(20)}
                y={rodYPx + curtainDropPx / 2}
                fill="#B45309"
                fontSize="12"
                className="font-sans tabular-nums font-semibold"
                dominantBaseline="middle"
              >
                Drop: {product.dimensions.dropCm}cm
              </text>
            </g>
          </svg>
        </div>

        {/* Accessible Openness Control Slider Bar with Visible Focus, >=44px Touch Target & Quick Buttons */}
        <div className="p-4 bg-white border-t border-stone-200">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-stone-700">
              <label htmlFor={sliderId} className="flex items-center gap-2 cursor-pointer font-medium">
                <span>Curtain Position:</span>
                <span className="tabular-nums text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                  {percentClosed}% closed
                </span>
              </label>
              {isDay ? (
                <span className="text-stone-500 tabular-nums hidden sm:inline text-[11px]">
                  Live Daylight Entry: {Math.round(lightPassing * 100)}%
                </span>
              ) : (
                <span className="text-stone-500 tabular-nums hidden sm:inline text-[11px]">
                  Room Lamplight: Warm Evening
                </span>
              )}
            </div>

            {/* Slider track container ensuring min 44px touch target height */}
            <div className="relative flex items-center min-h-[44px] py-2">
              <input
                id={sliderId}
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={openness}
                onPointerDown={cancelAnimation}
                onTouchStart={cancelAnimation}
                onKeyDown={cancelAnimation}
                onChange={(e) => {
                  cancelAnimation();
                  setOpenness(parseFloat(e.target.value));
                }}
                aria-label="Adjust curtain openness"
                aria-valuemin={0}
                aria-valuemax={1}
                aria-valuenow={openness}
                aria-valuetext={`${percentClosed} percent closed`}
                className="w-full h-3 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-700 focus:outline-none focus-visible:ring-3 focus-visible:ring-amber-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
              />
            </div>

            {/* Quick Snap Buttons beneath slider */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => animateToOpenness(0)}
                className="px-2.5 py-1 text-xs font-medium rounded-md border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 active:scale-[0.97] transition-all motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-amber-600"
              >
                ◀ Closed (100%)
              </button>

              <span className="text-[11px] text-stone-400 font-medium">Quick Presets</span>

              <button
                type="button"
                onClick={() => animateToOpenness(1)}
                className="px-2.5 py-1 text-xs font-medium rounded-md border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 active:scale-[0.97] transition-all motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-amber-600"
              >
                Open (0%) ▶
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Short Scale Caption */}
      <p className="text-[11px] text-stone-500 text-center sm:text-left px-1">
        Curtain drop ({product.dimensions.dropCm}cm) drawn to scale beside a 175cm person.
      </p>
    </div>
  );
}
