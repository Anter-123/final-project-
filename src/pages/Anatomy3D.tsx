import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Activity, Info, RefreshCw, Sparkles, Send, Loader2 } from "lucide-react";
import { chatService } from "../services/chatService";

export const Anatomy3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedPart, setSelectedPart] = useState<string | null>("Heart Overview");
  const [heartHealthData, setHeartHealthData] = useState({
    rate: "72 BPM",
    pressure: "120/80 mmHg",
    oxygen: "98%",
    condition: "Stable (Healthy)"
  });

  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Welcome to the 3D Anatomy AI Expert. Select any hotspot on the model and ask questions about its telemetry or clinical indications." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [sendingAI, setSendingAI] = useState(false);

  // Monitor when selectedPart changes to prompt the chat context
  useEffect(() => {
    if (selectedPart) {
      setAiChatMessages(prev => [
        ...prev,
        { sender: "ai", text: `[Focusing on: ${selectedPart}] What would you like to know about this cardiac quadrant?` }
      ]);
    }
  }, [selectedPart]);

  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg = aiInput;
    setAiChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setAiInput("");
    setSendingAI(true);

    // Normalize body part name to clean lowercase English for the backend/AI
    let bodyPart = "heart";
    if (selectedPart) {
      const lower = selectedPart.toLowerCase();
      if (lower.includes("aorta")) bodyPart = "aorta";
      else if (lower.includes("left")) bodyPart = "left ventricle";
      else if (lower.includes("right")) bodyPart = "right ventricle";
    }

    try {
      const response = await chatService.sendAIMessage(userMsg, bodyPart);
      setAiChatMessages(prev => [...prev, { sender: "ai", text: response.reply }]);
    } catch (err: any) {
      setAiChatMessages(prev => [
        ...prev,
        { sender: "ai", text: `AI Expert Error: ${err.message || "Failed to contact medical diagnostic service."}` }
      ]);
    } finally {
      setSendingAI(false);
    }
  };

  const partDetails: Record<string, string> = {
    "Heart Overview": "The heart is a muscular organ that pumps blood throughout the body. Select any highlighted anatomical quadrant to monitor localized vitals.",
    "Aorta Arch": "The main artery carrying oxygenated blood from the heart to the body. Flow velocity is currently stable at 1.2 m/s.",
    "Left Ventricle": "Responsible for pumping oxygenated blood to the body. Contraction volume (ejection fraction) is healthy at 65%.",
    "Right Ventricle": "Responsible for pumping oxygen-depleted blood to the lungs. Diastolic pressure is normal at 20 mmHg."
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;
    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight || 450;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // Slate-950

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 8;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    currentMount.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x0ea5e9, 1.2);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x10b981, 0.8);
    dirLight2.position.set(-5, -5, 5);
    scene.add(dirLight2);

    // 5. Build Stylized Programmatic Heart Model
    const heartGroup = new THREE.Group();

    // Ventricles (Base structure)
    const baseGeo = new THREE.SphereGeometry(1.2, 32, 16);
    const ventricleMat = new THREE.MeshPhongMaterial({
      color: 0xf43f5e, // Red
      emissive: 0x991b1b,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    const ventricles = new THREE.Mesh(baseGeo, ventricleMat);
    ventricles.scale.set(1, 1.3, 0.9);
    heartGroup.add(ventricles);

    // Aorta Arch (Torus)
    const aortaGeo = new THREE.TorusGeometry(0.7, 0.25, 16, 100, Math.PI);
    const aortaMat = new THREE.MeshPhongMaterial({
      color: 0x0ea5e9, // Blue/cyan
      emissive: 0x075985,
      wireframe: true,
      transparent: true,
      opacity: 0.9
    });
    const aorta = new THREE.Mesh(aortaGeo, aortaMat);
    aorta.position.set(0, 1.3, 0);
    aorta.rotation.x = Math.PI / 6;
    heartGroup.add(aorta);

    // Pulmonary Artery (Cylinder)
    const arteryGeo = new THREE.CylinderGeometry(0.2, 0.2, 1, 16);
    const arteryMat = new THREE.MeshPhongMaterial({
      color: 0x8b5cf6, // Purple
      emissive: 0x5b21b6,
      wireframe: true,
      transparent: true,
      opacity: 0.9
    });
    const artery = new THREE.Mesh(arteryGeo, arteryMat);
    artery.position.set(-0.5, 0.9, 0.3);
    artery.rotation.z = -Math.PI / 8;
    heartGroup.add(artery);

    scene.add(heartGroup);

    // 6. Interactive Hotspots (Glow Spheres)
    const hotspots: Array<{ name: string; mesh: THREE.Mesh }> = [];

    const createHotspot = (name: string, pos: THREE.Vector3, color: number) => {
      const geo = new THREE.SphereGeometry(0.12, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      heartGroup.add(mesh);
      hotspots.push({ name, mesh });
    };

    createHotspot("Aorta Arch", new THREE.Vector3(0.1, 1.7, 0.2), 0x06b6d4);
    createHotspot("Left Ventricle", new THREE.Vector3(0.5, -0.4, 0.6), 0xf43f5e);
    createHotspot("Right Ventricle", new THREE.Vector3(-0.5, -0.4, 0.6), 0x10b981);

    // 7. Raycasting for Clicking Nodes
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      
      // Check intersections
      const intersects = raycaster.intersectObjects(heartGroup.children);
      
      if (intersects.length > 0) {
        // Find if a hotspot was clicked
        const clickedMesh = intersects[0].object;
        const matched = hotspots.find(h => h.mesh === clickedMesh);
        if (matched) {
          setSelectedPart(matched.name);
          // Mock data updates on click
          if (matched.name === "Aorta Arch") {
            setHeartHealthData({ rate: "72 BPM", pressure: "118/78 mmHg", oxygen: "99%", condition: "Optimal flow" });
          } else if (matched.name === "Left Ventricle") {
            setHeartHealthData({ rate: "74 BPM", pressure: "120/80 mmHg", oxygen: "98%", condition: "Healthy Contraction" });
          } else if (matched.name === "Right Ventricle") {
            setHeartHealthData({ rate: "70 BPM", pressure: "115/75 mmHg", oxygen: "97%", condition: "Stable diastolic" });
          }
        }
      }
    };

    renderer.domElement.addEventListener("click", handleMouseClick);

    // 8. Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Rotate heart group gently
      heartGroup.rotation.y += 0.005;
      
      // Pulse animation for ventricles
      const time = Date.now() * 0.003;
      const pulseScale = 1.0 + Math.sin(time * 2) * 0.04;
      ventricles.scale.set(pulseScale, 1.3 * pulseScale, 0.9 * pulseScale);

      // Pulse animation for hotspots
      hotspots.forEach(h => {
        h.mesh.scale.setScalar(1 + Math.sin(time * 5) * 0.15);
      });

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener("click", handleMouseClick);
        currentMount.removeChild(renderer.domElement);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Interactive 3D Anatomy Suite</h2>
        <p className="text-sm text-muted-foreground">Interact with localized WebGL 3D organ meshes to inspect cardiac parameters</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Display */}
        <div className="lg:col-span-2 glass-panel rounded-2xl border overflow-hidden shadow-sm flex flex-col h-[500px] relative">
          <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-rose-500 animate-pulse" /> Live Cardiac Rotation
          </div>

          <div ref={mountRef} className="flex-1 w-full h-full" />
        </div>

        {/* Diagnostic parameters telemetry */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
              <Info className="h-4.5 w-4.5" /> Quadrant Telemetry
            </h3>

            <div className="space-y-3">
              <div className="pb-3 border-b">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Selected Component</span>
                <span className="font-bold text-sm block text-cyan-400 mt-1">{selectedPart}</span>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {selectedPart ? partDetails[selectedPart] : "Select a glowing hotspot node on the 3D heart model to inspect localized parameters."}
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heart Rate:</span>
                  <span className="font-semibold">{heartHealthData.rate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blood Pressure:</span>
                  <span className="font-semibold">{heartHealthData.pressure}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blood Oxygen (SpO2):</span>
                  <span className="font-semibold">{heartHealthData.oxygen}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cardiac Condition:</span>
                  <span className="font-semibold text-emerald-500">{heartHealthData.condition}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedPart("Heart Overview");
                setHeartHealthData({ rate: "72 BPM", pressure: "120/80 mmHg", oxygen: "98%", condition: "Stable (Healthy)" });
              }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl text-xs active:scale-95 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset Orientation
            </button>
          </div>

          {/* AI Quadrant Consultant */}
          <div className="glass-panel p-5 rounded-2xl border shadow-sm space-y-4 flex flex-col h-[320px]">
            <h3 className="font-bold text-xs text-primary flex items-center gap-1.5 border-b pb-2">
              <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" /> AI Heart Area Expert
            </h3>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-[11px] leading-relaxed">
              {aiChatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-2.5 rounded-xl ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none shadow-sm"
                        : "bg-muted text-foreground rounded-tl-none border"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {sendingAI && (
                <div className="flex justify-start">
                  <div className="bg-muted text-muted-foreground p-2 rounded-xl rounded-tl-none border flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handleSendAiMessage} className="flex gap-1.5 border-t pt-2.5">
              <input
                type="text"
                required
                disabled={sendingAI}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder={`Ask about ${selectedPart || "this part"}...`}
                className="flex-1 px-3 py-1.5 bg-background border rounded-lg text-[10px] focus:outline-none focus:border-primary transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={sendingAI || !aiInput.trim()}
                className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:shadow hover:shadow-primary/25 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center font-bold"
              >
                {sendingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
