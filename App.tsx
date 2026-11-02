import React, { useCallback, useEffect, useRef, useState } from "react";
import { AudioEngine } from "./services/AudioEngine";
import Visualizer from "./components/Visualizer";
import Controls from "./components/Controls";
import { AutoInterferenceMode, PresetType, SpatialEffect } from "./types";
import { PRESETS } from "./constants";

type IconName = "folder" | "file" | "record" | "download" | "wave";
const Icon = ({ name }: { name: IconName }) => {
  const paths: Record<IconName, React.ReactNode> = {
    folder: (
      <path d="M3 6.5h6l2 2h10v9.75A1.75 1.75 0 0 1 19.25 20H4.75A1.75 1.75 0 0 1 3 18.25zM3 8.5h18" />
    ),
    file: <path d="M6 3.5h8l4 4v13H6zM14 3.5v4h4" />,
    record: (
      <>
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16" />
      </>
    ),
    wave: <path d="M3 12h2l2-6 4 12 3-9 2 6 2-3h3" />,
  };
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
};
const SliderRow = ({
  id,
  label,
  value,
  min,
  max,
  step,
  unit = "%",
  onChange,
  format,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) => {
  const display = format
    ? format(value)
    : unit === "%"
      ? `${Math.round(value * 100)}%`
      : `${Math.round(value)}${unit}`;
  return (
    <div className="slider-row">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        style={
          {
            "--range-progress": `${((value - min) / (max - min)) * 100}%`,
          } as React.CSSProperties
        }
        onDoubleClick={() => onChange(min)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{display}</output>
    </div>
  );
};
const presetNames: Record<PresetType, string> = {
  [PresetType.CLEAN]: "Чистий сигнал",
  [PresetType.AM_RADIO]: "AM-радіо",
  [PresetType.PHONE]: "Старий телефон",
  [PresetType.OLD_RINGTONE]: "Старий рингтон",
  [PresetType.CHEAP_SPEAKER]: "Дешеві колонки",
  [PresetType.WALKIE_TALKIE]: "Рація",
  [PresetType.BLOWN_SPEAKER]: "Перевантажений динамік",
  [PresetType.UNDERWATER]: "Хрип і дрейф",
};

const App: React.FC = () => {
  const engineRef = useRef<AudioEngine | null>(null);
  const rafRef = useRef(0);
  const [engineReady, setEngineReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [currentPreset, setCurrentPreset] = useState<PresetType>(
    PresetType.CLEAN,
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<File[]>([]);
  const [isFolderMode, setIsFolderMode] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [trackHistory, setTrackHistory] = useState<string[]>([]);
  const [interferenceFileName, setInterferenceFileName] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [crapLevel, setCrapLevel] = useState(0);
  const [wobbleLevel, setWobbleLevel] = useState(0);
  const [quantizeLevel, setQuantizeLevel] = useState(0);
  const [spatialMode, setSpatialMode] = useState<SpatialEffect>(
    SpatialEffect.NONE,
  );
  const [autoIntMode, setAutoIntMode] = useState<AutoInterferenceMode>(
    AutoInterferenceMode.OFF,
  );
  const [degFreq, setDegFreq] = useState(0.2);
  const [degIntensity, setDegIntensity] = useState(0);
  const [snagIntensity, setSnagIntensity] = useState(0);
  const [interferenceLevel, setInterferenceLevel] = useState(0);
  const [heterodyneLevel, setHeterodyneLevel] = useState(0);
  const [isTestToneActive, setIsTestToneActive] = useState(false);
  const [isTappingActive, setIsTappingActive] = useState(false);
  const [isBroadcastCut, setIsBroadcastCut] = useState(false);
  const [isCrashing, setIsCrashing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [isEASActive, setIsEASActive] = useState(false);
  const addToHistory = (name: string) =>
    setTrackHistory((previous) => [name, ...previous].slice(0, 5));
  const updateEngineParams = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setSpatialEffect(spatialMode);
    engine.setDistortionLevel(crapLevel * 5);
    engine.setNoiseLevel(noiseLevel);
    engine.setWobbleLevel(wobbleLevel);
    engine.setQuantizeLevel(quantizeLevel);
    engine.setDegradation(degFreq, degIntensity);
    engine.setTapeSnag(snagIntensity);
    engine.setInterferenceLevel(interferenceLevel);
    engine.setHeterodyneLevel(heterodyneLevel);
    engine.setAutoInterference(autoIntMode);
    engine.triggerEAS(isEASActive);
    engine.toggleTestTone(isTestToneActive);
    engine.toggleTapping(isTappingActive);
    engine.toggleBroadcastCut(isBroadcastCut);
    engine.triggerSignalCrash(isCrashing);
  }, [
    autoIntMode,
    crapLevel,
    degFreq,
    degIntensity,
    heterodyneLevel,
    interferenceLevel,
    isBroadcastCut,
    isCrashing,
    isEASActive,
    isTappingActive,
    isTestToneActive,
    noiseLevel,
    quantizeLevel,
    snagIntensity,
    spatialMode,
    wobbleLevel,
  ]);
  const playRandomTrack = useCallback(async () => {
    if (!playlist.length || !engineRef.current) return;
    const file = playlist[Math.floor(Math.random() * playlist.length)];
    setFileName(file.name);
    addToHistory(file.name);
    setIsLoading(true);
    setCurrentTime(0);
    try {
      setDuration(await engineRef.current.loadFile(file));
      engineRef.current.play(
        PRESETS.find((preset) => preset.id === currentPreset) || PRESETS[0],
        0,
      );
      updateEngineParams();
      setIsPlaying(true);
    } catch (exception) {
      console.error("Failed to load playlist track", exception);
    } finally {
      setIsLoading(false);
    }
  }, [currentPreset, playlist, updateEngineParams]);
  useEffect(() => {
    engineRef.current = new AudioEngine();
    engineRef.current.onTrackEnd = () =>
      window.dispatchEvent(new Event("audio-track-end"));
    setEngineReady(true);
    return () => engineRef.current?.stop();
  }, []);
  useEffect(() => {
    const onEnd = () =>
      isFolderMode && playlist.length ? playRandomTrack() : setIsPlaying(false);
    window.addEventListener("audio-track-end", onEnd);
    return () => window.removeEventListener("audio-track-end", onEnd);
  }, [isFolderMode, playlist, playRandomTrack]);
  useEffect(() => {
    const update = () => {
      if (engineRef.current && isPlaying) {
        setCurrentTime(engineRef.current.getCurrentTime());
        rafRef.current = requestAnimationFrame(update);
      }
    };
    if (isPlaying) rafRef.current = requestAnimationFrame(update);
    else cancelAnimationFrame(rafRef.current);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !engineRef.current) return;
    setIsPlaying(false);
    setCurrentTime(0);
    setError(null);
    setDownloadUrl(null);
    setExportUrl(null);
    setIsFolderMode(false);
    setPlaylist([]);
    setFolderName(null);
    setFileName(file.name);
    addToHistory(file.name);
    setIsLoading(true);
    try {
      setDuration(await engineRef.current.loadFile(file));
    } catch (exception) {
      console.error(exception);
      setError("Не вдалося прочитати аудіофайл. Використовуйте MP3, WAV або OGG.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleDirectorySelect = async () => {
    if (!("showDirectoryPicker" in window)) {
      setError("Вибір папки підтримується в Chrome та Edge.");
      return;
    }
    try {
      // @ts-expect-error File System Access API is not in all TypeScript DOM libraries
      const directory = await window.showDirectoryPicker();
      const files: File[] = [];
      const scan = async (handle: any): Promise<void> => {
        for await (const entry of handle.values()) {
          if (entry.kind === "directory") await scan(entry);
          else if (/\.(mp3|wav|ogg)$/i.test(entry.name))
            files.push(await entry.getFile());
        }
      };
      setIsLoading(true);
      setError(null);
      await scan(directory);
      if (!files.length) setError("У вибраній папці не знайдено аудіофайлів.");
      else {
        setPlaylist(files);
        setFolderName(directory.name);
        setIsFolderMode(true);
        setFileName(`Папка: ${directory.name} · ${files.length} треків`);
        setIsPlaying(false);
      }
    } catch (exception: any) {
      if (exception?.name !== "AbortError")
        setError("Не вдалося отримати доступ до папки.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleInterferenceUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !engineRef.current) return;
    try {
      await engineRef.current.loadInterferenceFile(file);
      setInterferenceFileName(file.name);
    } catch (exception) {
      console.error(exception);
    }
  };
  const togglePlay = () => {
    const engine = engineRef.current;
    if (!engine || (!fileName && !playlist.length)) return;
    if (isPlaying) {
      engine.stop(false);
      setIsPlaying(false);
      setIsEASActive(false);
      setIsTestToneActive(false);
      setIsTappingActive(false);
      setIsBroadcastCut(false);
      setIsCrashing(false);
      setAutoIntMode(AutoInterferenceMode.OFF);
      return;
    }
    if (isFolderMode && playlist.length && engine.getCurrentTime() === 0) {
      playRandomTrack();
      return;
    }
    engine.play(
      PRESETS.find((preset) => preset.id === currentPreset) || PRESETS[0],
      currentTime,
    );
    updateEngineParams();
    setIsPlaying(true);
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.code === "Space" &&
        !(
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLSelectElement ||
          event.target instanceof HTMLButtonElement
        )
      ) {
        event.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
  const handleSeek = (time: number) => {
    if (!engineRef.current) return;
    setCurrentTime(time);
    engineRef.current.seek(
      time,
      PRESETS.find((preset) => preset.id === currentPreset) || PRESETS[0],
    );
    updateEngineParams();
  };
  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    setVolume(value);
    engineRef.current?.setVolume(value);
  };
  const changePreset = (presetId: PresetType) => {
    const preset = PRESETS.find((item) => item.id === presetId) || PRESETS[0];
    setCurrentPreset(presetId);
    setCrapLevel(preset.distortion ? preset.distortion / 5 : 0);
    setNoiseLevel(preset.noiseLevel);
    setWobbleLevel(preset.wobbleAmount);
    setQuantizeLevel(preset.quantizeAmount);
    setDegIntensity(0);
    setSnagIntensity(0);
    if (engineRef.current && isPlaying) {
      engineRef.current.applyPreset(preset);
      engineRef.current.setDegradation(0.2, 0);
      engineRef.current.setTapeSnag(0);
    }
  };
  const setManual = (type: string, value: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (type === "noise") {
      setNoiseLevel(value);
      engine.setNoiseLevel(value);
    }
    if (type === "crap") {
      setCrapLevel(value);
      engine.setDistortionLevel(value * 5);
    }
    if (type === "wobble") {
      setWobbleLevel(value);
      engine.setWobbleLevel(value);
    }
    if (type === "quantize") {
      setQuantizeLevel(value);
      engine.setQuantizeLevel(value);
    }
    if (type === "snag") {
      setSnagIntensity(value);
      engine.setTapeSnag(value);
    }
    if (type === "interference") {
      setInterferenceLevel(value);
      engine.setInterferenceLevel(value);
    }
    if (type === "heterodyne") {
      setHeterodyneLevel(value);
      engine.setHeterodyneLevel(value);
    }
    if (type === "degFreq") {
      setDegFreq(value);
      engine.setDegradation(value, degIntensity);
    }
    if (type === "degInt") {
      setDegIntensity(value);
      engine.setDegradation(degFreq, value);
    }
  };
  const toggle = (key: "tone" | "tap" | "cut" | "crash" | "eas") => {
    const engine = engineRef.current;
    if (!engine) return;
    if (key === "tone") {
      const next = !isTestToneActive;
      setIsTestToneActive(next);
      engine.toggleTestTone(next);
    }
    if (key === "tap") {
      const next = !isTappingActive;
      setIsTappingActive(next);
      engine.toggleTapping(next);
    }
    if (key === "cut") {
      const next = !isBroadcastCut;
      setIsBroadcastCut(next);
      engine.toggleBroadcastCut(next);
    }
    if (key === "crash") {
      const next = !isCrashing;
      setIsCrashing(next);
      engine.triggerSignalCrash(next);
    }
    if (key === "eas") {
      const next = !isEASActive;
      setIsEASActive(next);
      engine.triggerEAS(next);
    }
  };
  const toggleRecording = async () => {
    if (!engineRef.current) return;
    if (isRecording) {
      setDownloadUrl(await engineRef.current.stopRecording());
      setIsRecording(false);
    } else {
      setDownloadUrl(null);
      engineRef.current.startRecording();
      setIsRecording(true);
    }
  };
  const handleExport = async () => {
    if (!engineRef.current || isExporting) return;
    setIsExporting(true);
    setExportUrl(null);
    try {
      setExportUrl(
        await engineRef.current.renderOffline(
          PRESETS.find((preset) => preset.id === currentPreset) || PRESETS[0],
          noiseLevel,
          crapLevel * 5,
          wobbleLevel,
          spatialMode,
          degFreq,
          degIntensity,
          snagIntensity,
          quantizeLevel,
        ),
      );
    } catch (exception) {
      console.error(exception);
      setError("Не вдалося підготувати WAV.");
    } finally {
      setIsExporting(false);
    }
  };
  const status = isRecording
    ? "Запис"
    : isPlaying
      ? "Відтворення"
      : "Зупинено";
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="wordmark">
          DSP Radio Simulator
        </div>
        <div className="header-actions">
          <button className="button secondary" onClick={handleDirectorySelect}>
            <Icon name="folder" />
            Вибрати папку
          </button>
          <label className="button secondary">
            <Icon name="file" />
            Завантажити файл
            <input type="file" accept="audio/*" onChange={handleFileUpload} />
          </label>
          <span
            className={`status-dot ${isRecording ? "recording" : isPlaying ? "active" : ""}`}
          >
            <i />
            {status}
          </span>
        </div>
      </header>
      <div className="workspace">
        <section className="transport-pane" aria-label="Транспорт і пресети">
          <div className="track-meta">
            <span>
              {isLoading ? "Завантаження…" : fileName || "Файл не вибрано"}
            </span>
            {isFolderMode && folderName && <small>Папка: {folderName}</small>}
          </div>
          <div className="visualizer-wrap">
            {engineReady && engineRef.current && (
              <Visualizer
                analyser={engineRef.current.getAnalyser()}
                isPlaying={isPlaying || isEASActive}
              />
            )}
            {!isPlaying && !isLoading && (
              <div className="visualizer-state">
                {fileName ? "Пауза" : "Завантажте аудіофайл або виберіть папку"}
              </div>
            )}
            {error && <div className="visualizer-state error">{error}</div>}
          </div>
          <Controls
            isPlaying={isPlaying}
            onPlayPause={togglePlay}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            volume={volume}
            onVolumeChange={handleVolumeChange}
          />
          <section className="section presets">
            <div className="section-title">Пристрій</div>
            <div className="preset-list">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => changePreset(preset.id)}
                  className={currentPreset === preset.id ? "selected" : ""}
                >
                  {presetNames[preset.id]}
                </button>
              ))}
            </div>
          </section>
          <section className="section record-row">
            <div className="section-title">Запис</div>
            <div className="button-row">
              <button
                onClick={toggleRecording}
                className={`button secondary ${isRecording ? "selected" : ""}`}
              >
                <Icon name="record" />
                {isRecording ? "Завершити запис" : "Записати WebM"}
              </button>
              <button
                onClick={handleExport}
                disabled={!fileName || isExporting}
                className="button secondary"
              >
                <Icon name="download" />
                {isExporting ? "Підготовка…" : "Завантажити WAV"}
              </button>
            </div>
            {downloadUrl && (
              <a
                className="download-link"
                href={downloadUrl}
                download={`dsp-radio-simulator-${Date.now()}.webm`}
              >
                Завантажити запис WebM
              </a>
            )}
            {exportUrl && (
              <a
                className="download-link"
                href={exportUrl}
                download={`dsp-radio-simulator-${Date.now()}.wav`}
              >
                Завантажити оброблений WAV
              </a>
            )}
          </section>
        </section>
        <section className="parameter-pane" aria-label="Параметри обробки">
          <section className="section">
            <div className="section-title">Ефір і прийом</div>
            <SliderRow
              id="interference"
              label="Станція"
              value={interferenceLevel}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => setManual("interference", value)}
            />
            <SliderRow
              id="noise"
              label="Перешкоди"
              value={noiseLevel}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => setManual("noise", value)}
            />
            <SliderRow
              id="heterodyne"
              label="Свист"
              value={heterodyneLevel}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => setManual("heterodyne", value)}
            />
            <div className="control-row">
              <label htmlFor="auto">Автоперешкоди</label>
              <select
                id="auto"
                value={autoIntMode}
                onChange={(event) => {
                  const mode = event.target.value as AutoInterferenceMode;
                  setAutoIntMode(mode);
                  engineRef.current?.setAutoInterference(mode);
                }}
              >
                <option value={AutoInterferenceMode.OFF}>Немає</option>
                <option value={AutoInterferenceMode.WEAK}>Слабкі</option>
                <option value={AutoInterferenceMode.MEDIUM}>Середні</option>
                <option value={AutoInterferenceMode.HARD}>Сильні</option>
              </select>
            </div>
            <div className="control-row">
              <label htmlFor="station-file">Сусідня станція</label>
              <label className="file-select" htmlFor="station-file">
                {interferenceFileName || "Вибрати файл"}
                <input
                  id="station-file"
                  type="file"
                  accept="audio/*"
                  onChange={handleInterferenceUpload}
                />
              </label>
            </div>
          </section>
          <section className="section">
            <div className="section-title">Спотворення</div>
            <SliderRow
              id="distortion"
              label="Спотворення"
              value={crapLevel}
              min={0}
              max={100}
              step={1}
              onChange={(value) => setManual("crap", value)}
            />
            <SliderRow
              id="wobble"
              label="Детонація"
              value={wobbleLevel}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => setManual("wobble", value)}
            />
            <SliderRow
              id="digital"
              label="Цифровий шум"
              value={quantizeLevel}
              min={0}
              max={100}
              step={1}
              onChange={(value) => setManual("quantize", value)}
            />
            <SliderRow
              id="snag"
              label="Зрив стрічки"
              value={snagIntensity}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => setManual("snag", value)}
            />
            <SliderRow
              id="drift-rate"
              label="Швидкість дрейфу"
              value={degFreq}
              min={0.1}
              max={4}
              step={0.1}
              unit=" Гц"
              format={(value) => `${value.toFixed(1)} Гц`}
              onChange={(value) => setManual("degFreq", value)}
            />
            <SliderRow
              id="drift"
              label="Дрейф сигналу"
              value={degIntensity}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => setManual("degInt", value)}
            />
          </section>
          <section className="section">
            <div className="section-title">Простір</div>
            <div className="segmented">
              {[
                [SpatialEffect.NONE, "Немає"],
                [SpatialEffect.NEXT_ROOM, "Кімната"],
                [SpatialEffect.AUDITORIUM, "Зала"],
                [SpatialEffect.PA_SYSTEM, "Вокзал"],
                [SpatialEffect.CITY_ALERT, "Вулиця"],
              ].map(([mode, label]) => (
                <button
                  key={String(mode)}
                  className={spatialMode === mode ? "selected" : ""}
                  onClick={() => {
                    setSpatialMode(mode as SpatialEffect);
                    engineRef.current?.setSpatialEffect(mode as SpatialEffect);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
          <section className="section">
            <div className="section-title">Швидкі дії</div>
            <div className="button-row">
              <button
                className={`button secondary ${isTappingActive ? "selected" : ""}`}
                onClick={() => toggle("tap")}
              >
                Стук
              </button>
              <button
                className={`button secondary ${isTestToneActive ? "selected" : ""}`}
                onClick={() => toggle("tone")}
              >
                Тон 1 кГц
              </button>
              <button
                className={`button secondary ${isBroadcastCut ? "selected" : ""}`}
                onClick={() => toggle("cut")}
              >
                Заглушити
              </button>
              <button
                className={`button secondary ${isCrashing ? "selected" : ""}`}
                onClick={() => toggle("crash")}
              >
                Збій
              </button>
            </div>
            <button
              className={`button secondary alert-test ${isEASActive ? "selected" : ""}`}
              onClick={() => toggle("eas")}
            >
              <Icon name="wave" />
              {isEASActive
                ? "Зупинити тест сповіщення"
                : "Тест системи сповіщення"}
            </button>
          </section>
          {trackHistory.length > 0 && (
            <section className="section history">
              <div className="section-title">Історія</div>
              {trackHistory.map((track, index) => (
                <div key={`${track}-${index}`}>
                  <span>{index + 1}</span>
                  {track}
                </div>
              ))}
            </section>
          )}
        </section>
      </div>
    </main>
  );
};
export default App;
