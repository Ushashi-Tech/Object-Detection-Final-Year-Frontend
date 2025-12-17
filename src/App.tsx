import React, { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Video,
  FileText,
  Shield,
} from "lucide-react";
import CameraCapture from "./components/CameraCapture";
import DetectionResults from "./components/DetectionResults";
import ForensicReport from "./components/ForensicReport";
import LoadingAnalysis from "./components/LoadingAnalysis";

interface Detection {
  id: string;
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
  description: string;
  forensicSignificance: string;
}

interface AnalysisResult {
  detections: Detection[];
  imageUrl: string;
  timestamp: string;
  metadata: {
    resolution: string;
    fileSize: string;
    format: string;
  };
}

function App() {
  const [activeTab, setActiveTab] = useState<"upload" | "camera" | "video">(
    "upload"
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);
  const [showReport, setShowReport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔗 REAL BACKEND CALL
  const callBackendYOLO = async (file: File): Promise<AnalysisResult> => {
    const formData = new FormData();
    formData.append("file", file);

    // const response = await fetch("http://127.0.0.1:5000/predict", {
    const response = await fetch("https://object-detection-final-year-backend-1.onrender.com/predict", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as {
      detections: Array<{ class: string; confidence: number; bbox: [number, number, number, number] }>
    };

    const detections: Detection[] = data.detections.map((det, index) => ({
      id: `det_${index}`,
      class: det.class,
      confidence: det.confidence,
      bbox: det.bbox,
      description: `${det.class} detected with ${(det.confidence * 100).toFixed(1)}% confidence`,
      forensicSignificance: 'Potential forensic evidence detected by AI-based analysis',
    }));

    return {
      detections,
      imageUrl: URL.createObjectURL(file),
      timestamp: new Date().toISOString(),
      metadata: {
        resolution: "Unknown",
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        format: file.name.split(".").pop()?.toUpperCase() || "UNKNOWN",
      },
    };
  };

  // 📤 IMAGE UPLOAD
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);

    try {
      const result = await callBackendYOLO(file);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 📷 CAMERA IMAGE
  const handleCameraCapture = async (imageUrl: string) => {
    try {
      const blob = await fetch(imageUrl).then((res) => res.blob());
      const file = new File([blob], "camera_capture.jpg", {
        type: "image/jpeg",
      });

      setIsAnalyzing(true);
      const result = await callBackendYOLO(file);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Camera analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setShowReport(false);
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* HEADER */}
      <header className="border-b border-blue-400/20 backdrop-blur-xl bg-black/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-blue-300">
                ForensicAI Analyzer
              </h1>
              <p className="text-sm text-blue-200">
                YOLOv11 Crime Scene Detection
              </p>
            </div>
          </div>
          <div className="text-green-400 flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>Backend Connected</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!analysisResult && !isAnalyzing ? (
          <>
            {/* TABS */}
            <div className="flex justify-center mb-6">
              {(() => {
                const tabs: { key: 'upload' | 'camera' | 'video'; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
                  { key: 'upload', label: 'Upload Image', icon: Upload },
                  { key: 'camera', label: 'Live Camera', icon: Camera },
                  { key: 'video', label: 'Video', icon: Video },
                ];
                return tabs.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`mx-2 px-6 py-3 rounded-lg flex items-center gap-2 ${
                      activeTab === key
                        ? 'bg-blue-500'
                        : 'bg-black/30 hover:bg-black/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ));
              })()} 
            </div>

            {/* UPLOAD */}
            {activeTab === "upload" && (
              <div
                className="border-2 border-dashed border-blue-400 p-10 rounded-xl text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-16 h-16 mx-auto text-blue-400 mb-4" />
                <p>Click to upload image</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  hidden
                />
              </div>
            )}

            {/* CAMERA */}
            {activeTab === "camera" && (
              <CameraCapture onCapture={handleCameraCapture} />
            )}
          </>
        ) : isAnalyzing ? (
          <LoadingAnalysis />
        ) : analysisResult ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {analysisResult.detections.length} objects detected
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReport(true)}
                  className="bg-green-600 px-4 py-2 rounded"
                >
                  <FileText className="inline w-4 h-4 mr-2" />
                  Report
                </button>
                <button
                  onClick={resetAnalysis}
                  className="bg-gray-600 px-4 py-2 rounded"
                >
                  New Analysis
                </button>
              </div>
            </div>

            <DetectionResults result={analysisResult} />

            {showReport && (
              <ForensicReport
                result={analysisResult}
                onClose={() => setShowReport(false)}
              />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default App;
