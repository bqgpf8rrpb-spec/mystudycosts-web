import { ImageResponse } from 'next/og';
import { routing } from '@/i18n/routing';

export const alt = 'MyStudyCosts - Study Costs Calculator for Germany';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Locale-specific content
  const content = {
    de: {
      title: 'Studienkosten-Rechner',
      subtitle: 'Berechne deine Lebenshaltungskosten in Deutschland',
      description: 'Blockkonto • Semestergebühren • Visum',
    },
    en: {
      title: 'Study Costs Calculator',
      subtitle: 'Calculate your living costs in Germany',
      description: 'Blocked Account • Semester Fees • Visa',
    },
  };

  const text = content[locale as keyof typeof content] || content.en;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          position: 'relative',
        }}
      >
        {/* Background Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 30% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
          }}
        />

        {/* Main Content Container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 120px',
            width: '100%',
            height: '100%',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Logo/Brand Section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(147, 51, 234, 0.3) 100%)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)',
                fontSize: '48px',
              }}
            >
              💰
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
                  backgroundClip: 'text',
                  color: 'transparent',
                  lineHeight: '1.2',
                }}
              >
                MyStudyCosts
              </div>
              <div
                style={{
                  fontSize: '24px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  marginTop: '4px',
                }}
              >
                .com
              </div>
            </div>
          </div>

          {/* Main Title */}
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center',
              marginBottom: '24px',
              lineHeight: '1.1',
              maxWidth: '900px',
            }}
          >
            {text.title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '36px',
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center',
              marginBottom: '40px',
              lineHeight: '1.3',
              maxWidth: '800px',
            }}
          >
            {text.subtitle}
          </div>

          {/* Features/Description */}
          <div
            style={{
              display: 'flex',
              gap: '32px',
              alignItems: 'center',
              marginTop: '20px',
            }}
          >
            {text.description.split(' • ').map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  fontSize: '24px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: '500',
                }}
              >
                {item}
              </div>
            ))}
          </div>

          {/* Decorative Elements */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              right: '60px',
              width: '120px',
              height: '120px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '64px',
              opacity: 0.6,
            }}
          >
            📊
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

