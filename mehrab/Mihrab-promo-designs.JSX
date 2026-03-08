import { useState } from "react";

const fonts = `
@import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@300;400;500;700;800;900&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap');
`;

const InstagramSquare = () => (
  <div style={{
    width: 540,
    height: 540,
    background: "linear-gradient(160deg, #0a0a0f 0%, #1a0a1e 25%, #0f1a2e 50%, #0a1a1a 75%, #0f0a0a 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Tajawal', 'Amiri', sans-serif",
    direction: "rtl",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  }}>
    {/* Subtle geometric pattern overlay */}
    <div style={{
      position: "absolute",
      inset: 0,
      backgroundImage: `radial-gradient(circle at 50% 30%, rgba(212, 175, 55, 0.06) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(180, 60, 30, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 20% 70%, rgba(30, 100, 140, 0.06) 0%, transparent 40%)`,
    }} />

    {/* Top decorative arc - mihrab shape */}
    <div style={{
      position: "absolute",
      top: 20,
      left: "50%",
      transform: "translateX(-50%)",
      width: 380,
      height: 190,
      border: "1px solid rgba(212, 175, 55, 0.15)",
      borderBottom: "none",
      borderRadius: "190px 190px 0 0",
    }} />
    <div style={{
      position: "absolute",
      top: 30,
      left: "50%",
      transform: "translateX(-50%)",
      width: 360,
      height: 180,
      border: "1px solid rgba(212, 175, 55, 0.08)",
      borderBottom: "none",
      borderRadius: "180px 180px 0 0",
    }} />

    {/* Flame/ember dots */}
    {[...Array(12)].map((_, i) => (
      <div key={i} style={{
        position: "absolute",
        width: 2 + Math.random() * 3,
        height: 2 + Math.random() * 3,
        borderRadius: "50%",
        background: `rgba(${200 + Math.random() * 55}, ${80 + Math.random() * 80}, ${20 + Math.random() * 30}, ${0.15 + Math.random() * 0.2})`,
        top: `${15 + Math.random() * 70}%`,
        left: `${10 + Math.random() * 80}%`,
        filter: "blur(1px)",
      }} />
    ))}

    {/* Content */}
    <div style={{
      position: "relative",
      zIndex: 2,
      textAlign: "center",
      padding: "0 40px",
    }}>
      {/* Pre-title */}
      <div style={{
        color: "rgba(212, 175, 55, 0.7)",
        fontSize: 13,
        letterSpacing: 4,
        fontWeight: 300,
        marginBottom: 16,
        fontFamily: "'Tajawal', sans-serif",
      }}>
        ريتريت العشر الأواخر
      </div>

      {/* Main title - المحراب */}
      <div style={{
        fontFamily: "'Amiri', serif",
        fontSize: 68,
        fontWeight: 700,
        color: "#e8dcc8",
        lineHeight: 1,
        marginBottom: 8,
        textShadow: "0 0 40px rgba(212, 175, 55, 0.15)",
      }}>
        المحراب
      </div>

      {/* Decorative line */}
      <div style={{
        width: 120,
        height: 1,
        background: "linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.4), transparent)",
        margin: "12px auto",
      }} />

      {/* Subtitle */}
      <div style={{
        fontFamily: "'Tajawal', sans-serif",
        fontSize: 22,
        fontWeight: 300,
        color: "rgba(232, 220, 200, 0.85)",
        lineHeight: 1.6,
        marginBottom: 20,
      }}>
        من الاحتراق إلى الانبعاث
      </div>

      {/* Description */}
      <div style={{
        fontFamily: "'Tajawal', sans-serif",
        fontSize: 14,
        fontWeight: 300,
        color: "rgba(200, 190, 175, 0.6)",
        lineHeight: 1.8,
        maxWidth: 380,
        margin: "0 auto 28px",
      }}>
        ١٠ أيام تعيشها — لا تسمعها
        <br />
        اكتشف من أين تحترق — ولماذا — وكيف تنبعث
      </div>

      {/* Details row */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: 32,
        marginBottom: 24,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "rgba(212, 175, 55, 0.8)", fontSize: 12, fontWeight: 500, fontFamily: "'Tajawal'" }}>٢٠ رمضان</div>
          <div style={{ color: "rgba(200, 190, 175, 0.4)", fontSize: 10, fontFamily: "'Tajawal'" }}>البداية</div>
        </div>
        <div style={{ width: 1, height: 28, background: "rgba(212, 175, 55, 0.15)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "rgba(212, 175, 55, 0.8)", fontSize: 12, fontWeight: 500, fontFamily: "'Tajawal'" }}>١٠ لقاءات</div>
          <div style={{ color: "rgba(200, 190, 175, 0.4)", fontSize: 10, fontFamily: "'Tajawal'" }}>حية ومباشرة</div>
        </div>
        <div style={{ width: 1, height: 28, background: "rgba(212, 175, 55, 0.15)" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "rgba(212, 175, 55, 0.8)", fontSize: 12, fontWeight: 500, fontFamily: "'Tajawal'" }}>مجاني</div>
          <div style={{ color: "rgba(200, 190, 175, 0.4)", fontSize: 10, fontFamily: "'Tajawal'" }}>اللقاءات الحية</div>
        </div>
      </div>

      {/* CTA hint */}
      <div style={{
        fontFamily: "'Tajawal', sans-serif",
        fontSize: 12,
        color: "rgba(212, 175, 55, 0.5)",
        fontWeight: 400,
      }}>
        مع الكوتش محمود فؤاد | مصمم منظور الفؤاد
      </div>
    </div>

    {/* Bottom decorative element */}
    <div style={{
      position: "absolute",
      bottom: 16,
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: 6,
      alignItems: "center",
    }}>
      <div style={{ width: 20, height: 1, background: "rgba(212, 175, 55, 0.2)" }} />
      <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(212, 175, 55, 0.25)" }} />
      <div style={{ width: 20, height: 1, background: "rgba(212, 175, 55, 0.2)" }} />
    </div>
  </div>
);

const InstagramStory = () => (
  <div style={{
    width: 360,
    height: 640,
    background: "linear-gradient(180deg, #0a0a0f 0%, #1a0a1e 20%, #1a0f0a 50%, #0a0a0f 80%, #0f1a2e 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Tajawal', 'Amiri', sans-serif",
    direction: "rtl",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "50px 30px 40px",
  }}>
    {/* Glow effects */}
    <div style={{
      position: "absolute",
      top: "20%",
      left: "50%",
      transform: "translateX(-50%)",
      width: 300,
      height: 300,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(180, 80, 20, 0.08) 0%, transparent 70%)",
    }} />
    <div style={{
      position: "absolute",
      bottom: "30%",
      left: "50%",
      transform: "translateX(-50%)",
      width: 250,
      height: 250,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(30, 100, 160, 0.06) 0%, transparent 70%)",
    }} />

    {/* Top section */}
    <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
      <div style={{
        color: "rgba(212, 175, 55, 0.6)",
        fontSize: 11,
        letterSpacing: 3,
        fontWeight: 300,
        marginBottom: 20,
        fontFamily: "'Tajawal'",
      }}>
        ريتريت العشر الأواخر
      </div>
      <div style={{
        fontFamily: "'Amiri', serif",
        fontSize: 56,
        fontWeight: 700,
        color: "#e8dcc8",
        lineHeight: 1,
        marginBottom: 10,
      }}>
        المحراب
      </div>
      <div style={{
        width: 80,
        height: 1,
        background: "linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.4), transparent)",
        margin: "0 auto 14px",
      }} />
      <div style={{
        fontFamily: "'Tajawal'",
        fontSize: 19,
        fontWeight: 300,
        color: "rgba(232, 220, 200, 0.8)",
      }}>
        من الاحتراق إلى الانبعاث
      </div>
    </div>

    {/* Middle - hook questions */}
    <div style={{ textAlign: "center", position: "relative", zIndex: 2, padding: "0 10px" }}>
      <div style={{
        fontFamily: "'Tajawal'",
        fontSize: 15,
        fontWeight: 400,
        color: "rgba(200, 190, 175, 0.7)",
        lineHeight: 2.2,
      }}>
        هل حسيت إنك ماشي في حياتك
        <br />
        <span style={{ color: "rgba(232, 220, 200, 0.9)", fontWeight: 500 }}>بس جزء جوّاك مطفي؟</span>
        <br />
        <br />
        مش تعبان بس —
        <br />
        <span style={{ color: "rgba(200, 120, 60, 0.9)", fontWeight: 500 }}>محترق</span>
      </div>
    </div>

    {/* Bottom section */}
    <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
      <div style={{
        fontFamily: "'Tajawal'",
        fontSize: 13,
        color: "rgba(200, 190, 175, 0.5)",
        lineHeight: 1.8,
        marginBottom: 16,
      }}>
        ١٠ أيام حية — من ٢٠ رمضان
        <br />
        اللقاءات المباشرة مجانية
      </div>
      <div style={{
        fontFamily: "'Tajawal'",
        fontSize: 11,
        color: "rgba(212, 175, 55, 0.5)",
      }}>
        الكوتش محمود فؤاد | مصمم منظور الفؤاد
      </div>
    </div>
  </div>
);

const FacebookBanner = () => (
  <div style={{
    width: 820,
    height: 312,
    background: "linear-gradient(135deg, #0a0a0f 0%, #1a0a1e 30%, #1a0f0a 60%, #0f1a2e 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Tajawal', 'Amiri', sans-serif",
    direction: "rtl",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 60px",
  }}>
    {/* Glow */}
    <div style={{
      position: "absolute",
      top: "50%",
      right: "30%",
      transform: "translateY(-50%)",
      width: 400,
      height: 400,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(212, 175, 55, 0.04) 0%, transparent 60%)",
    }} />

    {/* Mihrab arch on the right */}
    <div style={{
      position: "absolute",
      right: 50,
      top: "50%",
      transform: "translateY(-50%)",
      width: 200,
      height: 260,
    }}>
      <div style={{
        width: 200,
        height: 100,
        border: "1px solid rgba(212, 175, 55, 0.12)",
        borderBottom: "none",
        borderRadius: "100px 100px 0 0",
      }} />
      <div style={{
        width: 200,
        height: 160,
        borderLeft: "1px solid rgba(212, 175, 55, 0.12)",
        borderRight: "1px solid rgba(212, 175, 55, 0.12)",
      }} />
    </div>

    {/* Right side - Title */}
    <div style={{ position: "relative", zIndex: 2 }}>
      <div style={{
        color: "rgba(212, 175, 55, 0.6)",
        fontSize: 11,
        letterSpacing: 3,
        fontWeight: 300,
        marginBottom: 10,
        fontFamily: "'Tajawal'",
      }}>
        ريتريت العشر الأواخر
      </div>
      <div style={{
        fontFamily: "'Amiri', serif",
        fontSize: 54,
        fontWeight: 700,
        color: "#e8dcc8",
        lineHeight: 1,
        marginBottom: 6,
      }}>
        المحراب
      </div>
      <div style={{
        width: 80,
        height: 1,
        background: "linear-gradient(90deg, rgba(212, 175, 55, 0.4), transparent)",
        marginBottom: 10,
      }} />
      <div style={{
        fontFamily: "'Tajawal'",
        fontSize: 18,
        fontWeight: 300,
        color: "rgba(232, 220, 200, 0.75)",
      }}>
        من الاحتراق إلى الانبعاث
      </div>
    </div>

    {/* Left side - Details */}
    <div style={{ position: "relative", zIndex: 2, textAlign: "left" }}>
      <div style={{
        fontFamily: "'Tajawal'",
        fontSize: 13,
        color: "rgba(200, 190, 175, 0.6)",
        lineHeight: 2,
        marginBottom: 14,
      }}>
        ١٠ لقاءات حية | بدءاً من ٢٠ رمضان
        <br />
        اللقاءات المباشرة مجانية
      </div>
      <div style={{
        fontFamily: "'Tajawal'",
        fontSize: 11,
        color: "rgba(212, 175, 55, 0.5)",
      }}>
        الكوتش محمود فؤاد | مصمم منظور الفؤاد
      </div>
    </div>
  </div>
);

const WhatsAppCard = () => (
  <div style={{
    width: 540,
    background: "linear-gradient(160deg, #0a0a0f 0%, #1a0a1e 40%, #0f1a2e 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Tajawal', 'Amiri', sans-serif",
    direction: "rtl",
    padding: "40px 36px",
  }}>
    {/* Glow */}
    <div style={{
      position: "absolute",
      top: 0,
      right: 0,
      width: 300,
      height: 300,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, transparent 60%)",
    }} />

    {/* Header */}
    <div style={{ textAlign: "center", marginBottom: 28, position: "relative", zIndex: 2 }}>
      <div style={{
        color: "rgba(212, 175, 55, 0.6)",
        fontSize: 11,
        letterSpacing: 3,
        fontWeight: 300,
        marginBottom: 12,
      }}>
        ريتريت العشر الأواخر
      </div>
      <div style={{
        fontFamily: "'Amiri', serif",
        fontSize: 48,
        fontWeight: 700,
        color: "#e8dcc8",
        lineHeight: 1,
        marginBottom: 8,
      }}>
        المحراب
      </div>
      <div style={{
        width: 80,
        height: 1,
        background: "linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.4), transparent)",
        margin: "0 auto 10px",
      }} />
      <div style={{
        fontSize: 18,
        fontWeight: 300,
        color: "rgba(232, 220, 200, 0.8)",
      }}>
        من الاحتراق إلى الانبعاث
      </div>
    </div>

    {/* Content blocks */}
    <div style={{
      position: "relative",
      zIndex: 2,
      fontSize: 14,
      color: "rgba(200, 190, 175, 0.65)",
      lineHeight: 2,
      marginBottom: 24,
    }}>
      <p style={{ marginBottom: 16 }}>
        <span style={{ color: "rgba(232, 220, 200, 0.9)", fontWeight: 500 }}>أنت مش بس تعبان — أنت محترق.</span>
        <br />
        ماشي في حياتك، شغال، بتصلي، بتصوم — بس جزء جواك مطفي.
      </p>
      <p style={{ marginBottom: 16 }}>
        في ١٠ أيام حية في العشر الأواخر — هنكتشف مع بعض:
      </p>
      <div style={{ padding: "0 16px", marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: "rgba(200, 120, 60, 0.8)" }}>◆</span> من أين يأتي الحريق — وليه بتحترق من غير ما تعرف
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: "rgba(60, 140, 180, 0.8)" }}>◆</span> الخوف اللي تحت الحريق — وإزاي تواجهه
        </div>
        <div>
          <span style={{ color: "rgba(120, 180, 80, 0.8)" }}>◆</span> أدوات التحرير — الصيام والسهر والعزلة والصمت بفهم جديد
        </div>
      </div>
    </div>

    {/* Details */}
    <div style={{
      borderTop: "1px solid rgba(212, 175, 55, 0.1)",
      paddingTop: 20,
      position: "relative",
      zIndex: 2,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-around",
        marginBottom: 16,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "rgba(212, 175, 55, 0.7)", fontSize: 13, fontWeight: 500 }}>١٠ لقاءات</div>
          <div style={{ color: "rgba(200, 190, 175, 0.4)", fontSize: 10 }}>حية ومباشرة</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "rgba(212, 175, 55, 0.7)", fontSize: 13, fontWeight: 500 }}>من ٢٠ رمضان</div>
          <div style={{ color: "rgba(200, 190, 175, 0.4)", fontSize: 10 }}>حتى ٢٩ رمضان</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "rgba(212, 175, 55, 0.7)", fontSize: 13, fontWeight: 500 }}>مجاني</div>
          <div style={{ color: "rgba(200, 190, 175, 0.4)", fontSize: 10 }}>اللقاءات المباشرة</div>
        </div>
      </div>
      <div style={{
        textAlign: "center",
        fontSize: 11,
        color: "rgba(212, 175, 55, 0.4)",
      }}>
        الكوتش محمود فؤاد | مصمم منظور الفؤاد
      </div>
    </div>
  </div>
);

export default function MihrabPromo() {
  const [activeTab, setActiveTab] = useState("instagram");

  const tabs = [
    { id: "instagram", label: "Instagram Post" },
    { id: "story", label: "Story" },
    { id: "facebook", label: "Facebook Banner" },
    { id: "whatsapp", label: "WhatsApp Card" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#111",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "30px 20px",
      fontFamily: "'Tajawal', sans-serif",
    }}>
      <style>{fonts}</style>

      <h1 style={{
        color: "#e8dcc8",
        fontFamily: "'Amiri', serif",
        fontSize: 28,
        fontWeight: 400,
        marginBottom: 24,
        textAlign: "center",
      }}>
        تصميمات المحراب — ريتريت العشر الأواخر
      </h1>

      {/* Tab navigation */}
      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: 30,
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: activeTab === tab.id ? "1px solid rgba(212, 175, 55, 0.5)" : "1px solid rgba(255,255,255,0.1)",
              background: activeTab === tab.id ? "rgba(212, 175, 55, 0.1)" : "rgba(255,255,255,0.03)",
              color: activeTab === tab.id ? "#d4af37" : "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "'Tajawal'",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Display area */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}>
        {activeTab === "instagram" && <InstagramSquare />}
        {activeTab === "story" && <InstagramStory />}
        {activeTab === "facebook" && <FacebookBanner />}
        {activeTab === "whatsapp" && <WhatsAppCard />}
      </div>

      {/* Size indicator */}
      <div style={{
        marginTop: 16,
        color: "rgba(255,255,255,0.3)",
        fontSize: 11,
        fontFamily: "'Tajawal'",
      }}>
        {activeTab === "instagram" && "1080 × 1080 px (scaled to 540)"}
        {activeTab === "story" && "1080 × 1920 px (scaled)"}
        {activeTab === "facebook" && "820 × 312 px"}
        {activeTab === "whatsapp" && "WhatsApp Forward Card"}
      </div>
    </div>
  );
}
