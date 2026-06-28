import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Activity, Info, RefreshCw, Sparkles, Send, Loader2 } from "lucide-react";
import { chatService } from "../services/chatService";
import { useLanguage } from "../context/LanguageContext";

export const Anatomy3D: React.FC = () => {
  const { lang } = useLanguage();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<any>(null);
  const [selectedPart, setSelectedPart] = useState<string | null>("Anatomy Overview");
  const [heartHealthData, setHeartHealthData] = useState({
    rate: "N/A",
    pressure: "Normal",
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
      const partNameAr = 
        selectedPart === "Head" ? "الرأس" :
        selectedPart === "Neck" ? "الرقبة" :
        selectedPart === "Chest" ? "الصدر" :
        selectedPart === "Abdomen" ? "البطن" :
        selectedPart === "Arm" ? "الذراع" :
        selectedPart === "Thigh" ? "الفخذ" :
        selectedPart === "Leg" ? "الساق" :
        selectedPart === "Back" ? "الظهر" :
        selectedPart === "Pelvis" ? "الحوض" : selectedPart;
        
      const msg = lang === "ar"
        ? `[التركيز على: ${partNameAr}] ما الذي تود معرفته عن هذا الجزء من الجسم صحياً أو تشخيصياً؟`
        : `[Focusing on: ${selectedPart}] What would you like to know about this anatomical region?`;

      setAiChatMessages(prev => [
        ...prev,
        { sender: "ai", text: msg }
      ]);
    }
  }, [selectedPart, lang]);

  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg = aiInput;
    setAiChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setAiInput("");
    setSendingAI(true);

    // Normalize body part name to clean lowercase English for the backend/AI
    let bodyPart = "general";
    if (selectedPart) {
      bodyPart = selectedPart.toLowerCase();
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
    "Anatomy Overview": lang === "ar" ? "نظرة عامة على التشريح: اضغط على أي جزء من أجزاء جسم الإنسان ثلاثي الأبعاد لاستكشاف العلامات الحيوية وبدء الاستشارة الطبية." : "Anatomy Overview: Select any part of the 3D human body model to explore vitals and initiate clinical AI consultation.",
    "Head": lang === "ar" ? "الرأس: يحتوي على الدماغ وأعضاء الحس الرئيسية. حدد لمراقبة الصحة العصبية والضغط القحفي." : "Head: Contains the brain and primary sensory organs. Select to monitor neurological parameters.",
    "Neck": lang === "ar" ? "الرقبة: تصل الرأس بالجذع وتحتوي على الغدة الدرقية والشرايين السباتية." : "Neck: Connects the head to the torso, containing the thyroid and carotid arteries.",
    "Chest": lang === "ar" ? "الصدر: يحتوي على القلب والرئتين والأوعية الدموية الرئيسية." : "Chest: Encloses the heart, lungs, and primary cardiovascular pathways.",
    "Abdomen": lang === "ar" ? "البطن: يحتوي على أعضاء الجهاز الهضمي الرئيسية مثل المعدة والكبد والأمعاء." : "Abdomen: Contains major digestive organs including stomach, liver, and intestines.",
    "Arm": lang === "ar" ? "الذراع: الهيكل العضلي الحركي للطرف العلوي." : "Arm: Musculoskeletal structure of the upper limb.",
    "Thigh": lang === "ar" ? "الفخذ: الجزء العلوي من الطرف السفلي ويضم عظم الفخذ وأقوى العضلات." : "Thigh: Upper segment of the lower limb, housing the femur and major muscles.",
    "Leg": lang === "ar" ? "الساق: الطرف السفلي المسؤول عن الحركة والتحمل." : "Leg: Lower limb section responsible for locomotion and weight-bearing.",
    "Back": lang === "ar" ? "الظهر: يدعم العمود الفقري ويحمي النخاع الشوكي." : "Back: Supports the spinal column and protects the central nervous system.",
    "Pelvis": lang === "ar" ? "الحوض: يدعم أعضاء الحوض التناسلية والبولية." : "Pelvis: Supports internal reproductive and urinary tracts.",
    // Fallback/Legacy heart parts in case clicked
    "Heart Overview": "The heart is a muscular organ that pumps blood throughout the body. Select any highlighted anatomical quadrant to monitor localized vitals.",
    "Aorta Arch": "The main artery carrying oxygenated blood from the heart to the body. Flow velocity is currently stable at 1.2 m/s.",
    "Left Ventricle": "Responsible for pumping oxygenated blood to the body. Ejection fraction is healthy at 65%.",
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

    // Initialize OrbitControls for manual navigation
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.maxDistance = 15;
    controls.minDistance = 2.5;
    controlsRef.current = controls;

    // 4. Lights (Pure white lights with high intensity to correctly illuminate colored models)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight2.position.set(-5, -8, -5);
    scene.add(dirLight2);

    // 5. Parent Model Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Track ventricles mesh for the fallback pulse animation
    let ventriclesMesh: THREE.Mesh | null = null;
    let customModelLoaded = false;

    // Load custom GLTF Model with Fallback
    const loader = new GLTFLoader();
    loader.load(
      "/heart_model.glb",
      (gltf) => {
        const customScene = gltf.scene;
        customModelLoaded = true;

        // 1. Calculate bounding box strictly around Mesh children to prevent microscopic scaling
        const box = new THREE.Box3();
        let hasMesh = false;
        customScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            box.expandByObject(child);
            hasMesh = true;
          }
        });

        if (!hasMesh) {
          box.setFromObject(customScene);
        }

        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Normalize max dimension to ~3.5 units for optimal camera viewing
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.5 / (maxDim || 1);

        // Use a container group to safely separate centering translation from scaling
        const container = new THREE.Group();
        customScene.position.copy(center).multiplyScalar(-1);
        container.add(customScene);
        container.scale.set(scale, scale, scale);

        // 2. Configure materials: ensure double-sided rendering, correct colors, and proper opacity
        customScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((mat) => {
                mat.side = THREE.DoubleSide; // Render both sides
                mat.transparent = false;      // Keep original material visibility
                mat.opacity = 1.0;
                // If it's standard material, ensure it responds properly to lighting
                if ('roughness' in mat) {
                  (mat as any).roughness = 0.45;
                }
              });
            }
          }
        });

        modelGroup.add(container);
      },
      undefined,
      (error) => {
        console.log("Custom 3D model (/heart_model.glb) not found or failed to load. Using fallback programmatic wireframe heart model.", error);

        // Fallback: Programmatic heart shapes
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
        ventriclesMesh = ventricles; // reference for fallback pulse

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

        modelGroup.add(heartGroup);
      }
    );

    // 6. Interactive Hotspots (Unused for human body model)
    const hotspots: Array<{ name: string; mesh: THREE.Mesh }> = [];

    // 7. Raycasting for Clicking Nodes
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let highlightedMesh: THREE.Mesh | null = null;
    const originalColor = new THREE.Color();
    const originalEmissive = new THREE.Color();

    const handleMouseClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      
      // Check intersections with all objects in modelGroup
      const intersects = raycaster.intersectObjects(modelGroup.children, true);
      
      if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        
        // 1. Check if a hotspot was clicked first
        const matchedHotspot = hotspots.find(h => h.mesh === clickedObject);
        if (matchedHotspot) {
          setSelectedPart(matchedHotspot.name);
          if (matchedHotspot.name === "Aorta Arch") {
            setHeartHealthData({ rate: "72 BPM", pressure: "118/78 mmHg", oxygen: "99%", condition: "Optimal flow" });
          } else if (matchedHotspot.name === "Left Ventricle") {
            setHeartHealthData({ rate: "74 BPM", pressure: "120/80 mmHg", oxygen: "98%", condition: "Healthy Contraction" });
          } else if (matchedHotspot.name === "Right Ventricle") {
            setHeartHealthData({ rate: "70 BPM", pressure: "115/75 mmHg", oxygen: "97%", condition: "Stable diastolic" });
          }
          return;
        }

        // 2. Otherwise, find which body node (part) was clicked by traversing up the parent chain
        let current: THREE.Object3D | null = clickedObject;
        let detectedPartName: string | null = null;
        
        while (current && current !== modelGroup) {
          const name = current.name;
          if (name) {
            const lowerName = name.toLowerCase();
            if (lowerName.includes("head")) { detectedPartName = "Head"; break; }
            if (lowerName.includes("neck")) { detectedPartName = "Neck"; break; }
            if (lowerName.includes("chest")) { detectedPartName = "Chest"; break; }
            if (lowerName.includes("belly") || lowerName.includes("stomach")) { detectedPartName = "Abdomen"; break; }
            if (lowerName.includes("arm")) { detectedPartName = "Arm"; break; }
            if (lowerName.includes("thigh")) { detectedPartName = "Thigh"; break; }
            if (lowerName.includes("leg")) { detectedPartName = "Leg"; break; }
            if (lowerName.includes("back")) { detectedPartName = "Back"; break; }
            if (lowerName.includes("pelvis")) { detectedPartName = "Pelvis"; break; }
          }
          current = current.parent;
        }

        if (detectedPartName) {
          setSelectedPart(detectedPartName);
          
          // Set dynamic telemetry for body parts
          if (detectedPartName === "Head") {
            setHeartHealthData({
              rate: lang === "ar" ? "نشط" : "Active",
              pressure: lang === "ar" ? "120/80 (طبيعي)" : "120/80 (Normal)",
              oxygen: "99%",
              condition: lang === "ar" ? "الضغط القحفي مستقر" : "Cranial Pressure Stable"
            });
          } else if (detectedPartName === "Chest") {
            setHeartHealthData({
              rate: "74 BPM",
              pressure: "120/80 mmHg",
              oxygen: "98%",
              condition: lang === "ar" ? "رنين الصدر سليم" : "Thoracic Rhythm Normal"
            });
          } else if (detectedPartName === "Abdomen") {
            setHeartHealthData({
              rate: "N/A",
              pressure: "Normal",
              oxygen: "98%",
              condition: lang === "ar" ? "التمثيل الغذائي مستقر" : "Metabolism Stable"
            });
          } else {
            setHeartHealthData({
              rate: "N/A",
              pressure: "Normal",
              oxygen: "98%",
              condition: lang === "ar" ? "الحالة العضلية سليمة" : "Muscular Tonus Normal"
            });
          }

          // 3. Highlight the clicked mesh with a glowing cyan emissive color
          if ((clickedObject as THREE.Mesh).isMesh) {
            const mesh = clickedObject as THREE.Mesh;
            
            // Restore previous highlight if any
            if (highlightedMesh && highlightedMesh.material) {
              const mats = Array.isArray(highlightedMesh.material) ? highlightedMesh.material : [highlightedMesh.material];
              mats.forEach((mat: any) => {
                if (mat.emissive) mat.emissive.copy(originalEmissive);
                if (mat.color) mat.color.copy(originalColor);
              });
            }
            
            // Save and apply new highlight
            if (mesh.material) {
              highlightedMesh = mesh;
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              const firstMat = mats[0] as any;
              if (firstMat) {
                if (firstMat.color) originalColor.copy(firstMat.color);
                if (firstMat.emissive) originalEmissive.copy(firstMat.emissive);
                
                mats.forEach((mat: any) => {
                  if (mat.emissive) mat.emissive.setHex(0x0ea5e9); // glowing blue/cyan
                });
              }
            }
          }
        }
      }
    };

    renderer.domElement.addEventListener("click", handleMouseClick);

    // 8. Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Update OrbitControls if enabled
      controls.update();
      
      const time = Date.now() * 0.003;
      
      // Fallback pulse animation if no custom model is loaded
      if (ventriclesMesh && !customModelLoaded) {
        const pulseScale = 1.0 + Math.sin(time * 2) * 0.04;
        ventriclesMesh.scale.set(pulseScale, 1.3 * pulseScale, 0.9 * pulseScale);
      }

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
      controls.dispose();
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
        <h2 className="text-2xl font-bold tracking-tight">{lang === "ar" ? "جناح التشريح ثلاثي الأبعاد التفاعلي" : "Interactive 3D Anatomy Suite"}</h2>
        <p className="text-sm text-muted-foreground">{lang === "ar" ? "تفاعل مع نموذج الجسم ثلاثي الأبعاد لاستكشاف الأعضاء والأجهزة والتشخيص الذكي" : "Interact with the 3D body model to explore organs, systems, and smart diagnostics"}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Canvas Display & Telemetry Card */}
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl border overflow-hidden shadow-sm flex flex-col h-[450px] relative">
            <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-rose-500 animate-pulse" /> {lang === "ar" ? "استكشاف تفاعلي ثلاثي الأبعاد" : "Interactive 3D Anatomy"}
            </div>

            <div ref={mountRef} className="flex-1 w-full h-full" />
          </div>

          {/* Telemetry Card (Moved under the model and made compact/horizontal) */}
          <div className="glass-panel p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-1.5 font-bold text-sky-400">
                <Info className="h-4 w-4" />
                <span>{lang === "ar" ? "العضو المحدد:" : "Selected Part:"}</span>
                <span className="text-foreground">{lang === "ar" && selectedPart === "Anatomy Overview" ? "نظرة عامة على التشريح" : selectedPart}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {selectedPart ? partDetails[selectedPart] : (lang === "ar" ? "اضغط على أي جزء من جسم الإنسان في المجسم ثلاثي الأبعاد لمعاينة مؤشراته الطبية." : "Select any part of the human body on the 3D model to inspect localized parameters.")}
              </p>
            </div>
            
            <button
              onClick={() => {
                setSelectedPart("Anatomy Overview");
                setHeartHealthData({ rate: "N/A", pressure: "Normal", oxygen: "98%", condition: "Stable (Healthy)" });
                if (controlsRef.current) {
                  controlsRef.current.reset();
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg text-xs active:scale-95 transition-all whitespace-nowrap self-start sm:self-center"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {lang === "ar" ? "إعادة ضبط الاتجاه" : "Reset Orientation"}
            </button>
          </div>

          {/* Guide Banner */}
          <div className="glass-panel p-4 rounded-xl border border-dashed border-sky-500/30 bg-sky-500/5 text-xs space-y-2">
            <h4 className="font-bold text-sky-400 flex items-center gap-1.5">
              <Info className="h-4 w-4" /> 
              {lang === "ar" ? "ملاحظة التفاعل والتحكم:" : "Interaction and Navigation:"}
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              {lang === "ar" ? (
                <>
                  يمكنك سحب الماوس أو اللمس بإصبعك لتدوير مجسم جسم الإنسان في أي اتجاه، واستخدام عجلة الماوس للتقريب والبحث. اضغط على أي عضو (الرأس، الصدر، الذراع، إلخ) للتركيز والتفاعل معه.
                </>
              ) : (
                <>
                  Drag with mouse or touch to rotate the human body model in any direction. Use scroll to zoom. Click on any body part (Head, Chest, Arm, etc.) to focus and analyze.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Column: AI Consultant (Fills 50% split) */}
        <div className="glass-panel p-5 rounded-2xl border shadow-sm space-y-4 flex flex-col h-[640px]">
          <h3 className="font-bold text-xs text-primary flex items-center gap-1.5 border-b pb-2">
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" /> {lang === "ar" ? "خبير تشخيص الأعضاء بالذكاء اصطناعي" : "Anatomy AI Expert"}
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
  );
};
