import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";

const YOUTUBE_PLAYLIST_URL =
  "https://youtube.com/playlist?list=PL-xfXH-OeuD-9SorMGuNPpPO1ubj7j8Qb&si=jQN8Y7GNOA5pf6LW";

const FALLBACK_VIDEO_ID = "uIYFObB-yv0";

/*
|--------------------------------------------------------------------------
| HORN SOUNDS
|--------------------------------------------------------------------------
| Put these files inside:
|
| public/
|   sounds/
|     horn-1.mp3
|     horn-2.mp3
|     horn-3.mp3
|     horn-4.mp3
|
| Every time HORN OK PLEASE is clicked, one random horn will play.
|--------------------------------------------------------------------------
*/

const HORN_SOUNDS = [
  "/sounds/sound1.mp3",
  "/sounds/sound2.mp3",
  "/sounds/sound3.mp3",
  "/sounds/sound4.mp3",
];

const busMemories = [
  "कृपया बस में धूम्रपान न करें, ड्राइवर साहब पहले ही धुएँ में हैं।",
  "चलती बस में चढ़ना मना है, स्टंट के लिए बॉलीवुड है।",
  "अपना सामान संभालकर रखें, बस की ब्रेक से ज्यादा भरोसा खुद पर रखें।",
  "कृपया चालक को परेशान न करें, मंज़िल तक पहुँचाने का काम उन्हीं का है।",
  "खिड़की वाली सीट मिल गई? समझिए आज किस्मत साथ है।",
  "टिकट लेकर यात्रा करें, चेहरा दिखाकर फ्री में नहीं।",
  "बस में सीट मिले तो ठीक, नहीं तो हैंडल भी अपना है।",
  "अगला पड़ाव — बेलथरा रोड। नींद खुल जाए तो उतर जाना।",
  "बलिया से लखनऊ — सफ़र लंबा है, गाने तैयार रखिए।",
  "बस धीरे चले तो शिकायत, तेज चले तो भी शिकायत — चालक करे तो करे क्या?",
  "कृपया सीट पर कब्ज़ा न करें, ये बस है आपकी पुश्तैनी ज़मीन नहीं।",
  "पीछे बैठने वालों से निवेदन है — सीट को DJ मत बनाइए।",
  "यात्रियों से निवेदन है, बस में रोमांस कम और सीट पर संतुलन ज्यादा रखें।",
  "बस की खिड़की से हाथ बाहर न निकालें, हवा लेने के और भी तरीके हैं।",
  "सफर का मज़ा लीजिए, किराए का हिसाब घर पहुँचकर कीजिए।",
  "अगर बस में नींद आ गई, तो अगला स्टॉप आपका हो भी सकता है… और नहीं भी।",
];

function playlistIdFromUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value);
    return url.searchParams.get("list") || "";
  } catch {
    const match = value.match(/[?&]list=([^&]+)/);
    return match ? match[1] : "";
  }
}

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";

  const seconds = Math.max(0, Math.floor(value));

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(
    2,
    "0",
  )}`;
}

function getIndiaTime() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date());
}

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }

    const oldCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      oldCallback?.();
      resolve();
    };

    if (
      !document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      )
    ) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }
  });
}

function App() {
  const rawPlaylistId = useMemo(
    () => playlistIdFromUrl(YOUTUBE_PLAYLIST_URL),
    [],
  );

  // YouTube "RD..." links are Mix/Radio feeds, not stable user playlists.
  // The IFrame API can reliably play the supplied video, but true
  // previous/next playlist navigation requires a normal "PL..." playlist.
  const playlistId = rawPlaylistId.startsWith("PL") ? rawPlaylistId : "";
  const isMix = rawPlaylistId.startsWith("RD");

  const playerRef = useRef(null);
  const progressTimer = useRef(null);

  // Horn audio reference
  const hornAudioRef = useRef(null);

  // Used to safely clean up horn timers
  const hornTimeoutRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [songTitle, setSongTitle] = useState(
    "Chura Liya Hai Tumne Jo Dil Ko",
  );
  const [songArtist, setSongArtist] = useState("पुराना सफ़र • YouTube");
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [memoryIndex, setMemoryIndex] = useState(0);
  const [clock, setClock] = useState(getIndiaTime());
  const [showPlaylistHint, setShowPlaylistHint] = useState(false);

  // NEW: controls the horn animation
  const [hornActive, setHornActive] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(getIndiaTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setMemoryIndex((value) => (value + 1) % busMemories.length);
    }, 3600);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let disposed = false;

    loadYouTubeAPI().then(() => {
      if (disposed || playerRef.current) return;

      const playerVars = {
        autoplay: 0,
        controls: 0,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        enablejsapi: 1,
        origin: window.location.origin,
        ...(playlistId
          ? {
              listType: "playlist",
              list: playlistId,
            }
          : {}),
      };

      playerRef.current = new window.YT.Player("yt-player", {
        width: "320",
        height: "180",
        videoId: FALLBACK_VIDEO_ID,
        playerVars,

        events: {
          onReady: (event) => {
            setReady(true);

            const player = event.target;

            // Force the exact supplied video into the player.
            // This avoids Mix/RD playlist initialization preventing playback.
            if (isMix || !playlistId) {
              player.cueVideoById(FALLBACK_VIDEO_ID);
            }

            const title = player.getVideoData?.().title;

            if (title) {
              setSongTitle(title);
            }

            if (!playlistId) {
              setShowPlaylistHint(true);
            }
          },

          onStateChange: (event) => {
            const player = event.target;
            const state = event.data;

            setPlaying(state === window.YT.PlayerState.PLAYING);

            if (state === window.YT.PlayerState.PLAYING) {
              clearInterval(progressTimer.current);

              progressTimer.current = setInterval(() => {
                setCurrent(player.getCurrentTime?.() || 0);
                setDuration(player.getDuration?.() || 0);

                if (playlistId) {
                  const index = player.getPlaylistIndex?.();

                  if (Number.isInteger(index) && index >= 0) {
                    setPlaylistIndex(index);
                  }
                }

                const title = player.getVideoData?.().title;

                if (title) {
                  setSongTitle(title);
                }
              }, 250);
            } else {
              clearInterval(progressTimer.current);
            }

            if (state === window.YT.PlayerState.ENDED && playlistId) {
              const index = player.getPlaylistIndex?.();

              if (Number.isInteger(index)) {
                setPlaylistIndex(index);
              }
            }
          },

          onError: (event) => {
            console.error("YouTube player error:", event.data);
            setPlaying(false);
          },
        },
      });
    });

    return () => {
      disposed = true;

      clearInterval(progressTimer.current);

      // Cleanup horn
      clearTimeout(hornTimeoutRef.current);

      if (hornAudioRef.current) {
        hornAudioRef.current.pause();
        hornAudioRef.current.currentTime = 0;
        hornAudioRef.current = null;
      }

      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [playlistId, isMix]);

  const togglePlay = () => {
    const player = playerRef.current;

    if (!player || !ready) return;

    if (playing) {
      player.pauseVideo();
      return;
    }

    // Explicit user click -> safe place to start YouTube playback.
    if (isMix || !playlistId) {
      player.loadVideoById(FALLBACK_VIDEO_ID);
    } else {
      player.playVideo();
    }
  };

  const previousSong = () => {
    const player = playerRef.current;

    if (!player || !ready) return;

    if (playlistId) {
      player.previousVideo();
    } else {
      player.seekTo(
        Math.max(0, (player.getCurrentTime?.() || 0) - 15),
        true,
      );
    }
  };

  const nextSong = () => {
    const player = playerRef.current;

    if (!player || !ready) return;

    if (playlistId) {
      player.nextVideo();
    } else {
      player.seekTo(
        Math.min(
          player.getDuration?.() || 0,
          (player.getCurrentTime?.() || 0) + 30,
        ),
        true,
      );
    }
  };

  const seek = (event) => {
    const player = playerRef.current;

    if (!player || !ready) return;

    const rect = event.currentTarget.getBoundingClientRect();

    const ratio = (event.clientX - rect.left) / rect.width;

    player.seekTo((player.getDuration?.() || 0) * ratio, true);
  };

  const toggleMute = () => {
    const player = playerRef.current;

    if (!player || !ready) return;

    if (muted) {
      player.unMute();
    } else {
      player.mute();
    }

    setMuted(!muted);
  };

  /*
  |--------------------------------------------------------------------------
  | HORN FUNCTION
  |--------------------------------------------------------------------------
  */

  const playHorn = () => {
    const player = playerRef.current;

    if (!player || !ready) return;

    /*
     * Stop currently playing horn.
     * This prevents multiple horns from overlapping
     * when the user clicks repeatedly.
     */
    if (hornAudioRef.current) {
      hornAudioRef.current.pause();
      hornAudioRef.current.currentTime = 0;
      hornAudioRef.current = null;
    }

    clearTimeout(hornTimeoutRef.current);

    /*
     * Select random horn
     */
    const randomHorn =
      HORN_SOUNDS[Math.floor(Math.random() * HORN_SOUNDS.length)];

    const horn = new Audio(randomHorn);

    /*
     * Full horn volume
     */
    horn.volume = 1;

    /*
     * Keep reference
     */
    hornAudioRef.current = horn;

    /*
     * Start visual animation
     */
    setHornActive(true);

    /*
     * Slow down current YouTube song.
     *
     * 0.6 = 60% playback speed.
     */
    try {
      player.setPlaybackRate(0.6);
    } catch (error) {
      console.warn("Playback speed could not be changed:", error);
    }

    /*
     * Play horn
     */
    horn
      .play()
      .then(() => {
        console.log("Horn playing:", randomHorn);
      })
      .catch((error) => {
        console.error("Horn playback failed:", error);

        setHornActive(false);

        try {
          player.setPlaybackRate(1);
        } catch {}
      });

    /*
     * When horn finishes:
     *
     * 1. Stop dance animation
     * 2. Restore music speed
     * 3. Clear audio reference
     */
    horn.onended = () => {
      setHornActive(false);

      try {
        player.setPlaybackRate(1);
      } catch (error) {
        console.warn("Could not restore playback speed:", error);
      }

      hornAudioRef.current = null;
    };
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <main className="app">
      <div className="bus-bg">
        <img
          src="/UP-BUS.png"
          alt="Uttar Pradesh Parivahan Bus Interior"
        />
      </div>

      <div className="warm-overlay" />

      <div className="grain" />

      <header className="topbar">
        <div className="clock">{clock}</div>

        {/* <div className="online">
          <span className="online-dot" />
          765 online
        </div> */}

        <nav className="top-actions">
          <button className="service-chip green">
            <span className="service-icon">S</span>
            Spotify
          </button>

          <button className="service-chip red">
            <span className="service-icon">▶</span>
            YT Music
          </button>

          <button className="outline-chip">Playlists</button>

          <button className="outline-chip">Songs</button>

          <button className="outline-chip">↓ Install</button>
        </nav>
      </header>

      <section className="center-content">
        {/* 
          Added hornActive class only when horn is playing.
          Existing location-label class remains untouched.
        */}
        <div
          className={`location-label ${
            hornActive ? "horn-location-dance" : ""
          }`}
        >
          उत्तर प्रदेश परिवहन
        </div>

        {/* 
          HORN OK PLEASE
        */}
       

        {/* <h1>
          सफ़र
          <br />
          <span>जारी है</span>
        </h1> */}

        {/* <p className="route-copy">
          BALLIA&nbsp;&nbsp;•&nbsp;&nbsp;SIKANDARPUR&nbsp;&nbsp;•&nbsp;&nbsp;
          BELTHARA ROAD&nbsp;&nbsp;•&nbsp;&nbsp;LUCKNOW
        </p> */}
         <button
          className={`horn-pill ${
            hornActive ? "horn-pill-active" : ""
          }`}
          onClick={playHorn}
          aria-label="Horn OK Please"
        >
          <span className="horn-symbol">📯</span>

          <span className="horn-text">
            HORN OK PLEASE
          </span>

          <span className="horn-status-dot" />
        </button>

        <div className="memory-pill">
          <span className="memory-light" />

          <span>{busMemories[memoryIndex]}</span>
        </div>
      </section>

      <button
        className="side-arrow left"
        onClick={previousSong}
        aria-label="Previous song"
      >
        <ChevronLeft size={18} />
      </button>

      <button
        className="side-arrow right"
        onClick={nextSong}
        aria-label="Next song"
      >
        <ChevronRight size={18} />
      </button>

      <section
        className={`cassette-player ${
          playing ? "play-state" : ""
        }`}
        aria-label="UP Parivahan bus driver playlist player"
      >
        <div className="cassette-window">
          <div className="cassette-label">
            <span>U.P. ROADWAYS</span>

            <strong>BUS DRIVER PLAYLIST</strong>
          </div>

          <div className="reels">
            <span className="reel left-reel">
              <i />
            </span>

            <span className="reel right-reel">
              <i />
            </span>
          </div>
        </div>

        <div className="cassette-info">
          <strong>{songTitle}</strong>

          <span>{songArtist}</span>

          <button
            className="progress"
            onClick={seek}
            aria-label="Seek song"
          >
            <span
              style={{
                width: `${Math.min(100, progress)}%`,
              }}
            />
          </button>

          <div className="time">
            <span>{formatTime(current)}</span>

            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="cassette-controls">
          <button
            onClick={previousSong}
            aria-label="Previous"
          >
            <SkipBack
              size={15}
              fill="currentColor"
            />
          </button>

          <button
            className="main-play"
            onClick={togglePlay}
            aria-label="Play pause"
          >
            {playing ? (
              <Pause
                size={17}
                fill="currentColor"
              />
            ) : (
              <Play
                size={17}
                fill="currentColor"
              />
            )}
          </button>

          <button
            onClick={nextSong}
            aria-label="Next"
          >
            <SkipForward
              size={15}
              fill="currentColor"
            />
          </button>

          <button
            onClick={toggleMute}
            aria-label="Mute"
          >
            {muted ? (
              <VolumeX size={14} />
            ) : (
              <Volume2 size={14} />
            )}
          </button>
        </div>
      </section>

      <div className="bottom-credit">
        बलिया → लखनऊ&nbsp;&nbsp; / &nbsp;&nbsp;आपकी यात्रा मंगलमय हो
      </div>

      {showPlaylistHint && (
        <button
          className="playlist-hint"
          onClick={() => setShowPlaylistHint(false)}
        >
          यह RD YouTube Mix है — पहला गाना चलेगा। असली fixed Next/Previous के
          लिए PL playlist URL दें.

          <span>×</span>
        </button>
      )}

      <div id="yt-player" />
    </main>
  );
}

export default App;