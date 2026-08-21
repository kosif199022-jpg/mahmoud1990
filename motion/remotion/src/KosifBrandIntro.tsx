import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type Props = {
  title: string;
  subtitle: string;
  eyebrow: string;
};

const palette = {
  ink: '#12211C',
  paper: '#F3F5F1',
  surface: '#FFFFFF',
  pine: '#0F3D31',
  viridian: '#0E7A5F',
  seal: '#A97E2F',
  sealLine: '#D9C08A',
  muted: '#5C6B62',
};

export const KosifBrandIntro: React.FC<Props> = ({title, subtitle, eyebrow}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const cardIn = spring({frame: frame - 12, fps, config: {damping: 18, stiffness: 115}});
  const titleIn = spring({frame: frame - 26, fps, config: {damping: 20, stiffness: 130}});
  const subtitleIn = spring({frame: frame - 42, fps, config: {damping: 20, stiffness: 120}});
  const lineScale = interpolate(frame, [34, 78], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outro = interpolate(frame, [206, 234], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.paper,
        color: palette.ink,
        fontFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif',
        overflow: 'hidden',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 18% 22%, rgba(169,126,47,.12), transparent 28%), radial-gradient(circle at 82% 74%, rgba(14,122,95,.10), transparent 30%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: 640,
          height: 640,
          borderRadius: '50%',
          border: `2px solid ${palette.sealLine}`,
          left: -220,
          top: -250,
          opacity: 0.28 * outro,
          transform: `scale(${0.96 + cardIn * 0.04})`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: 420,
          height: 420,
          borderRadius: '50%',
          border: `1px solid ${palette.sealLine}`,
          left: -110,
          top: -145,
          opacity: 0.18 * outro,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 86,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: outro,
        }}
      >
        <div
          style={{
            width: 1360,
            minHeight: 620,
            borderRadius: 44,
            backgroundColor: palette.surface,
            border: '1px solid #DDE4DC',
            boxShadow: '0 28px 80px -38px rgba(18,33,28,.30)',
            padding: '86px 104px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            transform: `translateY(${(1 - cardIn) * 40}px) scale(${0.985 + cardIn * 0.015})`,
            opacity: cardIn,
          }}
        >
          <div
            style={{
              color: palette.seal,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 0.4,
              marginBottom: 28,
              opacity: titleIn,
              transform: `translateY(${(1 - titleIn) * 20}px)`,
            }}
          >
            {eyebrow}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 28,
              direction: 'ltr',
            }}
          >
            <h1
              style={{
                margin: 0,
                color: palette.pine,
                fontFamily: 'Alexandria, "IBM Plex Sans Arabic", sans-serif',
                fontSize: 156,
                lineHeight: 1,
                fontWeight: 800,
                letterSpacing: -4,
                opacity: titleIn,
                transform: `translateY(${(1 - titleIn) * 34}px)`,
              }}
            >
              {title}
            </h1>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: palette.viridian,
                boxShadow: '0 0 0 10px rgba(14,122,95,.10)',
                opacity: titleIn,
              }}
            />
          </div>

          <div
            style={{
              width: `${lineScale * 100}%`,
              maxWidth: 510,
              height: 4,
              backgroundColor: palette.seal,
              borderRadius: 999,
              margin: '34px 0 32px',
              transformOrigin: 'right center',
            }}
          />

          <div
            style={{
              color: palette.muted,
              fontSize: 42,
              lineHeight: 1.4,
              fontWeight: 600,
              direction: 'ltr',
              textAlign: 'left',
              opacity: subtitleIn,
              transform: `translateY(${(1 - subtitleIn) * 24}px)`,
            }}
          >
            {subtitle}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 54,
              opacity: subtitleIn,
            }}
          >
            {['IFRS / SOCPA', 'Audit Intelligence', 'Arabic-first'].map((label) => (
              <div
                key={label}
                style={{
                  borderRadius: 999,
                  border: '1px solid #C7D2C6',
                  color: palette.pine,
                  backgroundColor: '#E7EFEA',
                  padding: '12px 22px',
                  fontSize: 23,
                  fontWeight: 700,
                  direction: 'ltr',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
